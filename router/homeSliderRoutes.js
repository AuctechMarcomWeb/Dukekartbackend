import { Router } from "express";

import {
  createHomeSlider,
  getAllHomeSliders,
  getActiveHomeSliders,
  getHomeSliderById,
  updateHomeSlider,
  updateHomeSliderStatus,
  deleteHomeSlider,
} from "../controllers/homeSliderController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// Public routes
router.get("/", getAllHomeSliders);
router.get("/active", getActiveHomeSliders);
router.get("/:id", getHomeSliderById);

// Admin routes
router.post("/", verifyJWT, createHomeSlider);
router.put("/:id", verifyJWT, updateHomeSlider);
router.patch("/:id/status", verifyJWT, updateHomeSliderStatus);
router.delete("/:id", verifyJWT, deleteHomeSlider);

export default router;