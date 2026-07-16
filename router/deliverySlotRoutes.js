import { Router } from "express";
import {
  createDeliverySlot,
  getAllDeliverySlots,
  getActiveDeliverySlots,
  getDeliverySlotById,
  updateDeliverySlot,
  toggleDeliverySlotStatus,
  deleteDeliverySlot,
} from "../controllers/deliverySlotController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// ── Public (web / app) ────────────────────────────────────────────────────────
router.get("/active", getActiveDeliverySlots);  // only isActive=true slots
router.get("/",       getAllDeliverySlots);      // all slots (admin panel)
router.get("/:id",    getDeliverySlotById);

// ── Admin only ────────────────────────────────────────────────────────────────
router.post(  "/",           verifyJWT, createDeliverySlot);
router.put(   "/:id",        verifyJWT, updateDeliverySlot);
router.patch( "/:id/toggle", verifyJWT, toggleDeliverySlotStatus);
router.delete("/:id",        verifyJWT, deleteDeliverySlot);

export default router;
