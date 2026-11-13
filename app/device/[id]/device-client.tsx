
"use client";

import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

type Content = {
  id: string;
  judul: string;
  tipe: "image" | "video" | "url" | "text" | string;
  payload: string;
  created_at?: string;
};

type PlaylistItem = {
  id: string;
  device_id: string;
  content_id: string;
  sort_order: number;
  contents: Content | Content[] | null;
};

type Props = {
  deviceId: string;
};

type ConnectionStatus =
  | "connecting"
  | "online"
  | "offline"
  | "error";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "http://localhost:5000";

export default function DeviceClient({ deviceId }: Props) {
  const [contents, setContents] = useState<Content[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  const [message, setMessage] = useState(
    "Menghubungkan perangkat..."
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ==========================================
  // LOAD PLAYLIST BERDASARKAN DEVICE ID
  // ==========================================

  const loadContents = useCallback(async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      setLoadError("");

      const response = await fetch(
        `${API_URL}/playlists/${deviceId}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil playlist."
        );
      }

      const playlistItems: PlaylistItem[] =
        Array.isArray(result.data) ? result.data : [];

      // Mengambil objek contents dari setiap item playlist.
      const playlistContents: Content[] =
        playlistItems.flatMap((item) => {
          if (!item.contents) return [];

          return Array.isArray(item.contents)
            ? item.contents
            : [item.contents];
        });

      setContents(playlistContents);
      setActiveIndex(0);

      if (playlistContents.length === 0) {
        setMessage(
          "Belum ada konten dalam playlist perangkat ini."
        );
      } else {
        setMessage(
          `${playlistContents.length} konten berhasil dimuat.`
        );
      }

      console.log(
        "Playlist berhasil dimuat:",
        playlistContents
      );
    } catch (error) {
      console.error("LOAD PLAYLIST ERROR:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil playlist."
      );
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // ==========================================
  // WEBSOCKET CONNECTION & RECONNECTION
  // ==========================================

  useEffect(() => {
    if (!deviceId) {
      setConnectionStatus("error");
      setMessage("ID perangkat tidak ditemukan.");
      return;
    }

    let mounted = true;

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Socket berhasil terhubung.
    socket.on("connect", () => {
      if (!mounted) return;

      setConnectionStatus("connecting");
      setMessage(
        "Terhubung ke server. Mendaftarkan perangkat..."
      );

      // Registrasi ulang setiap koneksi berhasil.
      socket.emit("device:register", { deviceId });

      console.log("Register device:", deviceId);
    });

    // Registrasi perangkat berhasil.
    socket.on(
      "device:registered",
      (result: { success?: boolean }) => {
        if (!mounted) return;

        if (result?.success) {
          setConnectionStatus("online");
          setMessage("Perangkat terhubung");

          console.log("Device registered successfully.");

          // Sinkronisasi playlist setelah reconnect.
          void loadContents();
        }
      }
    );

    // Registrasi perangkat gagal.
    socket.on(
      "device:error",
      (result: { message?: string }) => {
        if (!mounted) return;

        setConnectionStatus("error");

        setMessage(
          result?.message ||
            "Perangkat gagal didaftarkan."
        );
      }
    );

    // ==========================================
    // PUSH CONTENT DARI ADMIN
    // ==========================================

    socket.on("device:content", (content: Content) => {
      if (!mounted) return;

      if (
        !content ||
        typeof content.id !== "string" ||
        typeof content.judul !== "string" ||
        typeof content.payload !== "string"
      ) {
        console.error(
          "Data konten dari server tidak valid."
        );
        return;
      }

      console.log(
        "Konten diterima dari admin:",
        content
      );

      // Push Content menggantikan tampilan playlist
      // untuk sementara.
      setContents([content]);
      setActiveIndex(0);
      setLoadError("");
      setLoading(false);
      setMessage(`Konten diterima: ${content.judul}`);
    });

    // ==========================================
    // DISCONNECT
    // ==========================================

    socket.on("disconnect", (reason) => {
      if (!mounted) return;

      setConnectionStatus("offline");

      setMessage(
        "Koneksi terputus. Mencoba menghubungkan kembali..."
      );

      console.log(
        "Device socket disconnected:",
        reason
      );
    });

    // ==========================================
    // CONNECTION ERROR
    // ==========================================

    socket.on("connect_error", (error) => {
      if (!mounted) return;

      setConnectionStatus("offline");

      setMessage(
        "Server belum dapat dijangkau. Mencoba kembali..."
      );

      console.error(
        "Device socket connection error:",
        error.message
      );
    });

    // Cleanup ketika halaman ditutup.
    return () => {
      mounted = false;

      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [deviceId, loadContents]);

  // ==========================================
  // LOAD PLAYLIST SAAT HALAMAN PERTAMA DIBUKA
  // ==========================================

  useEffect(() => {
    void loadContents();
  }, [loadContents]);

  // ==========================================
  // AUTO PLAY PLAYLIST SETIAP 10 DETIK
  // ==========================================

  useEffect(() => {
    if (contents.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        return (current + 1) % contents.length;
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [contents.length]);

  const activeContent = contents[activeIndex];

  // ==========================================
  // DEVICE CLIENT UI
  // ==========================================

  return (
    <main className="device-screen">
      <header className="device-status">
        <div className="status-information">
          <span
            className={`status-dot ${connectionStatus}`}
          />

          <span>{message}</span>
        </div>

        <button
          type="button"
          onClick={() => void loadContents()}
          disabled={loading}
        >
          {loading ? "Memuat..." : "Muat ulang playlist"}
        </button>
      </header>

      <section className="content-stage">
        {loading ? (
          <div className="placeholder">
            <div className="loading-spinner" />
            <p>Memuat playlist...</p>
          </div>
        ) : loadError ? (
          <div className="placeholder">
            <h1>Gagal memuat playlist</h1>

            <p>{loadError}</p>

            <button
              type="button"
              className="retry-button"
              onClick={() => void loadContents()}
            >
              Coba lagi
            </button>
          </div>
        ) : !activeContent ? (
          <div className="placeholder">
            <h1>Belum ada konten</h1>

            <p>
              Tambahkan konten ke playlist perangkat
              melalui Admin Dashboard.
            </p>
          </div>
        ) : activeContent.tipe === "image" ? (
          <img
            key={activeContent.id}
            className="media-content"
            src={activeContent.payload}
            alt={activeContent.judul}
          />
        ) : activeContent.tipe === "video" ? (
          <video
            key={activeContent.id}
            className="media-content"
            src={activeContent.payload}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : activeContent.tipe === "url" ? (
          <iframe
            key={activeContent.id}
            className="url-content"
            src={activeContent.payload}
            title={activeContent.judul}
          />
        ) : (
          <div
            key={activeContent.id}
            className="text-content"
          >
            {activeContent.payload}
          </div>
        )}
      </section>

      {activeContent && (
        <footer className="content-caption">
          <span>{activeContent.judul}</span>

          <span>
            {activeIndex + 1} / {contents.length}
          </span>
        </footer>
      )}

      <style jsx>{`
        .device-screen {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #080b12;
          color: #ffffff;
          font-family: Arial, sans-serif;
        }

        .device-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
          background: #111827;
          color: #d1d5db;
          font-size: 12px;
        }

        .status-information {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .device-status button,
        .retry-button {
          border: 1px solid #475569;
          border-radius: 6px;
          padding: 7px 12px;
          color: #ffffff;
          background: transparent;
          cursor: pointer;
        }

        .device-status button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #f59e0b;
        }

        .status-dot.online {
          background: #22c55e;
        }

        .status-dot.offline,
        .status-dot.error {
          background: #ef4444;
        }

        .content-stage {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .media-content {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .url-content {
          width: 100%;
          height: 100%;
          border: 0;
          background: #ffffff;
        }

        .text-content {
          max-width: 90%;
          padding: 24px;
          color: #ffffff;
          font-size: clamp(28px, 6vw, 80px);
          font-weight: 700;
          text-align: center;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .placeholder {
          max-width: 600px;
          padding: 24px;
          color: #cbd5e1;
          text-align: center;
        }

        .placeholder h1 {
          margin-bottom: 12px;
          font-size: 28px;
          font-weight: 700;
        }

        .placeholder p {
          line-height: 1.6;
        }

        .retry-button {
          margin-top: 16px;
        }

        .loading-spinner {
          width: 30px;
          height: 30px;
          margin: 0 auto 16px;
          border: 3px solid #334155;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .content-caption {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 16px;
          background: #111827;
          color: #94a3b8;
          font-size: 12px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
