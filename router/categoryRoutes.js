import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../controllers/categoryController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = Router();

// 🔓 Public
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// 🔐 Admin
router.post("/", verifyJWT, createCategory);
router.put("/:id", verifyJWT, updateCategory);
router.delete("/:id", verifyJWT, deleteCategory);
router.patch("/:id/toggle", verifyJWT, toggleCategoryStatus);

export default router;
