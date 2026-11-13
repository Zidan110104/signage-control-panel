
import { Router } from "express";

import {
  getPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  reorderPlaylist,
} from "../controllers/playlist.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// Device Client boleh membaca playlist.
router.get("/:deviceId", getPlaylist);

// Perubahan playlist hanya boleh dilakukan admin.
router.post("/:deviceId", authenticateToken, addToPlaylist);
router.put("/:deviceId/reorder", authenticateToken, reorderPlaylist);
router.delete("/:deviceId/:contentId", authenticateToken, removeFromPlaylist);

export default router;
