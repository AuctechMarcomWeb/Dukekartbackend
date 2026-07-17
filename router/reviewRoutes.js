import express from "express";
import {
  getProductReviews,
  addReview,
  updateReview,
  deleteReview,
  getAllReviews,
  toggleApproval,
} from "../controllers/reviewController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = express.Router();

// Public: anyone can read reviews
router.get("/",         getProductReviews); // ?productId=
// Admin: all reviews
router.get("/all",      verifyJWT, getAllReviews);

// Authenticated
router.post("/",        verifyJWT, addReview);
router.patch("/:reviewId",         verifyJWT, updateReview);
router.delete("/:reviewId",        verifyJWT, deleteReview);
router.patch("/:reviewId/approve", verifyJWT, toggleApproval);

export default router;
