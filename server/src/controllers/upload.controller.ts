
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../config/supabase.js";

export const uploadContent = async (
  req: Request,
  res: Response
) => {
  let uploadedPath: string | null = null;

  try {
    const file = req.file;
    const judul = req.body.judul;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File wajib dipilih",
      });
    }

    if (typeof judul !== "string" || !judul.trim()) {
      return res.status(400).json({
        success: false,
        message: "Judul konten wajib diisi",
      });
    }

    const allowedTypes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/webm": "webm",
    };

    const extension = allowedTypes[file.mimetype];

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Format hanya JPG, PNG, WEBP, MP4, dan WEBM",
      });
    }

    const tipe = file.mimetype.startsWith("image/")
      ? "image"
      : "video";

    const filePath = `${tipe}/${randomUUID()}.${extension}`;
    uploadedPath = filePath;

    const { error: uploadError } = await supabase.storage
      .from("signage-content")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from("signage-content")
      .getPublicUrl(filePath);

    const { data, error: databaseError } = await supabase
      .from("contents")
      .insert({
        judul: judul.trim(),
        tipe,
        payload: publicData.publicUrl,
      })
      .select()
      .single();

    if (databaseError) throw databaseError;

    uploadedPath = null;

    return res.status(201).json({
      success: true,
      message: "File berhasil diunggah",
      data,
    });
  } catch (error) {
    console.error("UPLOAD CONTENT ERROR:", error);

    if (uploadedPath) {
      await supabase.storage
        .from("signage-content")
        .remove([uploadedPath]);
    }

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengunggah file",
    });
  }
};
