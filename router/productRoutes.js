import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getActiveProducts,
  getProductById,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from "../controllers/productController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";
import Review from "../models/Review.modal.js";
import Product from "../models/Product.modal.js";
import mongoose from "mongoose";

const router = Router();

// ── Public routes (used by web / app) ────────────────────────────────────────
router.get("/",        getAllProducts);    // Admin panel list  (all statuses)
router.get("/active",  getActiveProducts); // Web / app         (only active)
router.get("/:id",     getProductById);    // Single product

// ── Admin-only routes ─────────────────────────────────────────────────────────
router.post(  "/",           verifyJWT, createProduct);
router.put(   "/:id",        verifyJWT, updateProduct);
router.patch( "/:id/toggle", verifyJWT, toggleProductStatus);
router.delete("/:id",        verifyJWT, deleteProduct);

// ── One-time sync: recalculate reviewCount + rating for ALL products ──────────
// GET /api/product/sync-reviews  (admin only)
router.get("/sync-reviews", verifyJWT, async (req, res) => {
  try {
    const products = await Product.find({}, "_id");
    let updated = 0;
    for (const p of products) {
      const result = await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(p._id), isApproved: true } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]);
      const avg   = result[0]?.avg   ?? 0;
      const count = result[0]?.count ?? 0;
      await Product.findByIdAndUpdate(p._id, {
        rating:      Math.round(avg * 10) / 10,
        reviewCount: count,
      });
      updated++;
    }
    res.json({ success: true, message: `Synced ${updated} products` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
