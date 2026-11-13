
import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Terjadi kesalahan server";

// GET /api/playlists/:deviceId
export const getPlaylist = async (req: Request, res: Response) => {
  try {
    const deviceId = getParam(req.params.deviceId);

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "ID perangkat wajib diisi",
      });
    }

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id")
      .eq("id", deviceId)
      .maybeSingle();

    if (deviceError) throw deviceError;

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Perangkat tidak ditemukan",
      });
    }

    const { data, error } = await supabase
      .from("device_playlists")
      .select(`
        id,
        device_id,
        content_id,
        sort_order,
        created_at,
        contents (
          id,
          judul,
          tipe,
          payload,
          created_at
        )
      `)
      .eq("device_id", deviceId)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Playlist berhasil diambil",
      data,
    });
  } catch (error) {
    console.error("GET PLAYLIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// POST /api/playlists/:deviceId
export const addToPlaylist = async (req: Request, res: Response) => {
  try {
    const deviceId = getParam(req.params.deviceId);
    const { contentId } = req.body;

    if (
      !deviceId ||
      typeof contentId !== "string" ||
      !contentId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "ID perangkat dan ID konten wajib diisi",
      });
    }

    const normalizedContentId = contentId.trim();

    // Cek apakah konten sudah ada di playlist perangkat
    const { data: existing, error: existingError } = await supabase
      .from("device_playlists")
      .select("id")
      .eq("device_id", deviceId)
      .eq("content_id", normalizedContentId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Konten sudah ada di playlist perangkat ini",
      });
    }

    // Tentukan urutan berikutnya
    const { data: lastItem, error: lastError } = await supabase
      .from("device_playlists")
      .select("sort_order")
      .eq("device_id", deviceId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) throw lastError;

    const nextOrder = (lastItem?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("device_playlists")
      .insert({
        device_id: deviceId,
        content_id: normalizedContentId,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Konten berhasil ditambahkan ke playlist",
      data,
    });
  } catch (error) {
    console.error("ADD PLAYLIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// DELETE /api/playlists/:deviceId/:contentId
export const removeFromPlaylist = async (
  req: Request,
  res: Response
) => {
  try {
    const deviceId = getParam(req.params.deviceId);
    const contentId = getParam(req.params.contentId);

    if (!deviceId || !contentId) {
      return res.status(400).json({
        success: false,
        message: "ID perangkat dan ID konten wajib diisi",
      });
    }

    const { data, error } = await supabase
      .from("device_playlists")
      .delete()
      .eq("device_id", deviceId)
      .eq("content_id", contentId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Konten tidak ditemukan dalam playlist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Konten berhasil dihapus dari playlist",
    });
  } catch (error) {
    console.error("REMOVE PLAYLIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// PUT /api/playlists/:deviceId/reorder
export const reorderPlaylist = async (
  req: Request,
  res: Response
) => {
  try {
    const deviceId = getParam(req.params.deviceId);
    const { contentIds } = req.body;

    if (
      !deviceId ||
      !Array.isArray(contentIds) ||
      !contentIds.every((id) => typeof id === "string") ||
      new Set(contentIds).size !== contentIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "ID perangkat atau daftar ID konten tidak valid",
      });
    }

    const { data: currentItems, error: fetchError } = await supabase
      .from("device_playlists")
      .select("content_id")
      .eq("device_id", deviceId);

    if (fetchError) throw fetchError;

    const currentIds = (currentItems ?? []).map((item) => item.content_id);

    // Pastikan daftar yang dikirim mencakup seluruh isi playlist saat ini
    if (
      contentIds.length !== currentIds.length ||
      !contentIds.every((id: string) => currentIds.includes(id))
    ) {
      return res.status(400).json({
        success: false,
        message: "Daftar konten harus sesuai dengan isi playlist saat ini",
      });
    }

    const updates = await Promise.all(
      contentIds.map((contentId: string, index: number) =>
        supabase
          .from("device_playlists")
          .update({ sort_order: index })
          .eq("device_id", deviceId)
          .eq("content_id", contentId)
      )
    );

    const failedUpdate = updates.find((result) => result.error);

    if (failedUpdate?.error) throw failedUpdate.error;

    return res.status(200).json({
      success: true,
      message: "Urutan playlist berhasil diperbarui",
    });
  } catch (error) {
    console.error("REORDER PLAYLIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};
