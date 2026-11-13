
import { Request, Response } from "express";
import * as contentService from "../services/content.service.js";

const getContentId = (req: Request): string | undefined => {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Terjadi kesalahan server";

export const getContents = async (_req: Request, res: Response) => {
  try {
    const data = await contentService.getAllContents();
    return res.status(200).json({
      success: true,
      message: "Data konten berhasil diambil",
      data,
    });
  } catch (error) {
    console.error("GET CONTENTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const getContent = async (req: Request, res: Response) => {
  try {
    const id = getContentId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID konten wajib diisi",
      });
    }

    const data = await contentService.getContentById(id);
    return res.status(200).json({
      success: true,
      message: "Detail konten berhasil diambil",
      data,
    });
  } catch (error) {
    console.error("GET CONTENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const addContent = async (req: Request, res: Response) => {
  try {
    const { judul, tipe, payload } = req.body;

    if (
      typeof judul !== "string" || !judul.trim() ||
      typeof tipe !== "string" ||
      !["image", "video", "url", "text"].includes(tipe) ||
      typeof payload !== "string" || !payload.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Judul, tipe, dan payload wajib diisi dengan format yang benar",
      });
    }

    const data = await contentService.createContent(
      judul.trim(),
      tipe,
      payload.trim()
    );

    return res.status(201).json({
      success: true,
      message: "Konten berhasil ditambahkan",
      data,
    });
  } catch (error) {
    console.error("ADD CONTENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const editContent = async (req: Request, res: Response) => {
  try {
    const id = getContentId(req);
    const { judul, tipe, payload } = req.body;

    if (!id || typeof judul !== "string" || !judul.trim() ||
      typeof tipe !== "string" ||
      !["image", "video", "url", "text"].includes(tipe) ||
      typeof payload !== "string" || !payload.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "ID, judul, tipe, dan payload wajib diisi dengan benar",
      });
    }

    const data = await contentService.updateContent(
      id,
      judul.trim(),
      tipe,
      payload.trim()
    );

    return res.status(200).json({
      success: true,
      message: "Konten berhasil diperbarui",
      data,
    });
  } catch (error) {
    console.error("EDIT CONTENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const removeContent = async (req: Request, res: Response) => {
  try {
    const id = getContentId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID konten wajib diisi",
      });
    }

    await contentService.deleteContent(id);

    return res.status(200).json({
      success: true,
      message: "Konten berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE CONTENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};
    