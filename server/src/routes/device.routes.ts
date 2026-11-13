
import { Router } from "express";
import {
  getDevices,
  getDevice,
  addDevice,
  editDevice,
  removeDevice
} from "../controllers/device.controller";

const router = Router();

router.get("/", getDevices);
router.get("/:id", getDevice);
router.post("/", addDevice);
router.put("/:id", editDevice);
router.delete("/:id", removeDevice);

export default router;
