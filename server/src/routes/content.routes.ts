
import { Router } from "express";
import multer from "multer";

import {
  getContents,
  getContent,
  addContent,
  editContent,
  removeContent,
} from "../controllers/content.controller.js";

import { uploadContent } from "../controllers/upload.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

// Upload hanya untuk admin.
router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  uploadContent
);

// Membaca konten boleh dilakukan Device Client.
router.get("/", getContents);
router.get("/:id", getContent);

// Perubahan konten hanya untuk admin.
router.post("/", authenticateToken, addContent);
router.put("/:id", authenticateToken, editContent);
router.delete("/:id", authenticateToken, removeContent);

export default router;
