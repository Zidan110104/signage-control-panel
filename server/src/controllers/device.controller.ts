
import { Request, Response } from "express";
import * as deviceService from "../services/device.service.js";

// Mengambil ID perangkat dari URL
const getDeviceId = (req: Request): string | undefined => {
  const id = req.params.id;

  return Array.isArray(id) ? id[0] : id;
};

// Mengambil pesan error
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan server";
};

// GET /api/devices
// Mengambil semua perangkat
export const getDevices = async (_req: Request, res: Response) => {
  try {
    const data = await deviceService.getAllDevices();

    return res.status(200).json({
      success: true,
      message: "Data perangkat berhasil diambil",
      data
    });
  } catch (error: unknown) {
    console.error("GET DEVICES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error)
    });
  }
};

// GET /api/devices/:id
// Mengambil detail perangkat
export const getDevice = async (req: Request, res: Response) => {
  try {
    const id = getDeviceId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID perangkat tidak valid"
      });
    }

    const data = await deviceService.getDeviceById(id);

    return res.status(200).json({
      success: true,
      message: "Detail perangkat berhasil diambil",
      data
    });
  } catch (error: unknown) {
    console.error("GET DEVICE ERROR:", error);

    return res.status(404).json({
      success: false,
      message: getErrorMessage(error)
    });
  }
};

// POST /api/devices
// Menambahkan perangkat baru
export const addDevice = async (req: Request, res: Response) => {
  try {
    const { nama, lokasi } = req.body;

    if (
      typeof nama !== "string" ||
      !nama.trim() ||
      typeof lokasi !== "string" ||
      !lokasi.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Nama dan lokasi wajib diisi dalam bentuk teks"
      });
    }

    const data = await deviceService.createDevice(
      nama.trim(),
      lokasi.trim()
    );

    return res.status(201).json({
      success: true,
      message: "Perangkat berhasil ditambahkan",
      data
    });
  } catch (error: unknown) {
    console.error("ADD DEVICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error)
    });
  }
};

// PUT /api/devices/:id
// Mengubah data perangkat
export const editDevice = async (req: Request, res: Response) => {
  try {
    const id = getDeviceId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID perangkat tidak valid"
      });
    }

    const { nama, lokasi } = req.body;

    if (
      typeof nama !== "string" ||
      !nama.trim() ||
      typeof lokasi !== "string" ||
      !lokasi.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Nama dan lokasi wajib diisi dalam bentuk teks"
      });
    }

    const data = await deviceService.updateDevice(
      id,
      nama.trim(),
      lokasi.trim()
    );

    return res.status(200).json({
      success: true,
      message: "Perangkat berhasil diperbarui",
      data
    });
  } catch (error: unknown) {
    console.error("EDIT DEVICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error)
    });
  }
};

// DELETE /api/devices/:id
// Menghapus perangkat
export const removeDevice = async (req: Request, res: Response) => {
  try {
    const id = getDeviceId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID perangkat tidak valid"
      });
    }

    await deviceService.deleteDevice(id);

    return res.status(200).json({
      success: true,
      message: "Perangkat berhasil dihapus"
    });
  } catch (error: unknown) {
    console.error("DELETE DEVICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error)
    });
  }
};
