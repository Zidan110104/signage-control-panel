import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import deviceRoutes from "./routes/device.routes.js";
import contentRoutes from "./routes/content.routes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { authenticateToken } from "./middleware/auth.middleware.js";
import { registerDeviceSocket } from "./sockets/device.socket.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

app.use("/api/auth", authRoutes);

// Contents: GET publik, perubahan data dilindungi JWT di route.
app.use("/api/contents", contentRoutes);

// Devices: hanya admin yang dapat mengakses CRUD perangkat.
app.use("/api/devices", authenticateToken, deviceRoutes);

// Playlists: GET publik, perubahan playlist dilindungi JWT di route.
app.use("/api/playlists", playlistRoutes);

const io = new Server(httpServer, {
  cors: {
    origin: frontendUrl,
    methods: ["GET", "POST"],
  },
});

registerDeviceSocket(io);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Signage API is running",
  });
});

const PORT = Number(process.env.PORT) || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
