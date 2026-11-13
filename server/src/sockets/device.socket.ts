
import { Server } from "socket.io";
import type { Socket } from "socket.io";
import { supabase } from "../config/supabase.js";

const deviceConnections = new Map<string, Set<string>>();
const socketDevices = new Map<string, string>();

type RegisterPayload = {
  deviceId?: string;
};

type PushContentPayload = {
  deviceId?: string;
  contentId?: string;
};

async function updateDeviceStatus(
  deviceId: string,
  status: "online" | "offline"
) {
  const { data, error } = await supabase
    .from("devices")
    .update({
      status,
      last_seen: new Date().toISOString(),
    })
    .eq("id", deviceId)
    .select("id, nama, lokasi, status, last_seen")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Perangkat tidak ditemukan di database.");
  }

  return data;
}

// Menghapus koneksi socket dari daftar perangkat.
async function removeDeviceConnection(
  io: Server,
  socket: Socket
) {
  const deviceId = socketDevices.get(socket.id);

  if (!deviceId) return;

  socketDevices.delete(socket.id);

  const connections = deviceConnections.get(deviceId);

  connections?.delete(socket.id);

  // Masih ada koneksi lain untuk perangkat yang sama.
  if (connections && connections.size > 0) {
    console.log(
      `Device ${deviceId} masih memiliki koneksi aktif.`
    );
    return;
  }

  deviceConnections.delete(deviceId);

  try {
    const device = await updateDeviceStatus(
      deviceId,
      "offline"
    );

    io.emit("device:status", device);

    console.log(`Device ${deviceId} is offline.`);
  } catch (error) {
    console.error("DEVICE DISCONNECT ERROR:", error);
  }
}

export function registerDeviceSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("Socket connected:", socket.id);

    // ==========================================
    // REGISTER DEVICE
    // ==========================================

    socket.on(
      "device:register",
      async (payload: RegisterPayload = {}) => {
        const deviceId = payload.deviceId;

        if (
          typeof deviceId !== "string" ||
          !deviceId.trim()
        ) {
          socket.emit("device:error", {
            message: "ID perangkat tidak valid.",
          });
          return;
        }

        const normalizedId = deviceId.trim();

        try {
          const previousDeviceId = socketDevices.get(
            socket.id
          );

          // Jika socket berpindah perangkat,
          // lepaskan koneksi dari perangkat sebelumnya.
          if (
            previousDeviceId &&
            previousDeviceId !== normalizedId
          ) {
            socket.leave(`device:${previousDeviceId}`);

            const previousConnections =
              deviceConnections.get(previousDeviceId);

            previousConnections?.delete(socket.id);

            socketDevices.delete(socket.id);

            if (
              !previousConnections ||
              previousConnections.size === 0
            ) {
              deviceConnections.delete(previousDeviceId);

              const previousData = await updateDeviceStatus(
                previousDeviceId,
                "offline"
              );

              io.emit("device:status", previousData);
            }
          }

          // Pastikan perangkat benar-benar ada di database
          // dan perbarui status menjadi online.
          const device = await updateDeviceStatus(
            normalizedId,
            "online"
          );

          if (!deviceConnections.has(normalizedId)) {
            deviceConnections.set(
              normalizedId,
              new Set()
            );
          }

          deviceConnections.get(normalizedId)!.add(
            socket.id
          );

          socketDevices.set(socket.id, normalizedId);

          socket.join(`device:${normalizedId}`);

          socket.emit("device:registered", {
            success: true,
            device,
          });

          io.emit("device:status", device);

          console.log(
            `Device ${normalizedId} registered. Socket: ${socket.id}`
          );
        } catch (error) {
          console.error("DEVICE REGISTER ERROR:", error);

          socket.emit("device:error", {
            message:
              error instanceof Error
                ? error.message
                : "Gagal mendaftarkan perangkat.",
          });
        }
      }
    );

    // ==========================================
    // PUSH CONTENT TO SELECTED DEVICE
    // ==========================================

    socket.on(
      "admin:push-content",
      async (payload: PushContentPayload = {}) => {
        const { deviceId, contentId } = payload;

        if (
          typeof deviceId !== "string" ||
          !deviceId.trim() ||
          typeof contentId !== "string" ||
          !contentId.trim()
        ) {
          socket.emit("content:push:result", {
            success: false,
            message: "ID perangkat atau konten tidak valid.",
          });
          return;
        }

        const normalizedDeviceId = deviceId.trim();
        const normalizedContentId = contentId.trim();

        try {
          const connections = deviceConnections.get(
            normalizedDeviceId
          );

          if (!connections || connections.size === 0) {
            socket.emit("content:push:result", {
              success: false,
              message: "Perangkat sedang offline.",
            });
            return;
          }

          const { data: content, error } = await supabase
            .from("contents")
            .select("id, judul, tipe, payload, created_at")
            .eq("id", normalizedContentId)
            .maybeSingle();

          if (error) throw error;

          if (!content) {
            socket.emit("content:push:result", {
              success: false,
              message: "Konten tidak ditemukan.",
            });
            return;
          }

          // Kirim hanya ke room perangkat yang dipilih.
          io.to(`device:${normalizedDeviceId}`).emit(
            "device:content",
            content
          );

          socket.emit("content:push:result", {
            success: true,
            message: `Konten "${content.judul}" berhasil dikirim.`,
            data: {
              deviceId: normalizedDeviceId,
              content,
            },
          });

          console.log(
            `Content ${content.id} pushed to device ${normalizedDeviceId}`
          );
        } catch (error) {
          console.error("PUSH CONTENT ERROR:", error);

          socket.emit("content:push:result", {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Gagal mengirim konten.",
          });
        }
      }
    );

    // ==========================================
    // DEVICE DISCONNECT
    // ==========================================

    socket.on("disconnect", async (reason) => {
      console.log(
        `Socket disconnected: ${socket.id}. Reason: ${reason}`
      );

      await removeDeviceConnection(io, socket);
    });
  });
}
