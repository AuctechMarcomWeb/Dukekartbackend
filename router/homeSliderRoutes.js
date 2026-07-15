import { Router } from "express";
import {
  createHomeSlider,
  getAllHomeSliders,
  getHomeSliderById,
  updateHomeSlider,
  deleteHomeSlider,
} from "../controllers/homeSliderController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔓 Public (Frontend)
router.get("/", getAllHomeSliders);
router.get("/:id", getHomeSliderById);

// 🔐 Admin
router.post("/", verifyJWT, createHomeSlider);
router.put("/:id", verifyJWT, updateHomeSlider);
router.delete("/:id", verifyJWT, deleteHomeSlider);

export default router;
