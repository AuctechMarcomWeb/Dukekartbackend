import { Router } from "express";
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  validateCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
} from "../controllers/couponController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// ── Public (checkout / app) ───────────────────────────────────────────────────
router.post("/validate",   validateCoupon);   // POST  /api/coupon/validate
router.get( "/:id",        getCouponById);    // GET   /api/coupon/:id or :code

// ── Admin panel ───────────────────────────────────────────────────────────────
router.get(   "/",           verifyJWT, getAllCoupons);
router.post(  "/",           verifyJWT, createCoupon);
router.put(   "/:id",        verifyJWT, updateCoupon);
router.patch( "/:id/toggle", verifyJWT, toggleCouponStatus);
router.delete("/:id",        verifyJWT, deleteCoupon);

export default router;
