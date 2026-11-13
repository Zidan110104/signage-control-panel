import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username dan password wajib diisi",
      });
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminUsername || !passwordHash || !jwtSecret) {
      return res.status(500).json({
        success: false,
        message: "Konfigurasi autentikasi belum lengkap",
      });
    }

    const validUsername = username === adminUsername;
    const validPassword = await bcrypt.compare(password, passwordHash);

    if (!validUsername || !validPassword) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah",
      });
    }

    const token = jwt.sign(
      { username: adminUsername, role: "admin" },
      jwtSecret,
      { expiresIn: "8h", algorithm: "HS256" }
    );

    return res.json({
      success: true,
      message: "Login berhasil",
      token,
      user: {
        username: adminUsername,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login",
    });
  }
};