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

export default router;
