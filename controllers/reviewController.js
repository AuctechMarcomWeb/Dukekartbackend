import Review from "../models/Review.modal.js";
import Product from "../models/Product.modal.js";
import Order from "../models/Order/Order.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

// Helper: recalculate product average rating
const syncProductRating = async (productId) => {
  const result = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avg   = result[0]?.avg   ?? 0;
  const count = result[0]?.count ?? 0;
  await Product.findByIdAndUpdate(productId, {
    rating:      Math.round(avg * 10) / 10,
    reviewCount: count,   // ← correct field name from Product model
  });
};

// ── GET /api/reviews?productId=&page=&limit= ──────────────────────────────
export const getProductReviews = async (req, res) => {
  try {
    const { productId, page = 1, limit = 10 } = req.query;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json(new apiResponse(400, null, "Valid productId is required"));
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId, isApproved: true })
        .populate("user", "name profilepic")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments({ product: productId, isApproved: true }),
    ]);

    // Rating distribution
    const dist = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]);
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    dist.forEach(d => { distribution[d._id] = d.count; });

    return res.status(200).json(
      new apiResponse(200, {
        reviews,
        distribution,
        total,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
      }, "Reviews fetched")
    );
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── POST /api/reviews ─────────────────────────────────────────────────────
export const addReview = async (req, res) => {
  try {
    const { productId, orderId, rating, title, comment, images } = req.body;

    if (!productId || !rating) {
      return res.status(400).json(new apiResponse(400, null, "productId and rating are required"));
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json(new apiResponse(400, null, "Invalid productId"));
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json(new apiResponse(404, null, "Product not found"));

    // Verified purchase check
    let isVerifiedPurchase = false;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      const order = await Order.findOne({
        _id: orderId,
        user: req.user._id,
        "items.product": productId,
        orderStatus: "Delivered",
      });
      if (order) isVerifiedPurchase = true;
    }

    const existing = await Review.findOne({ product: productId, user: req.user._id });
    if (existing) {
      return res.status(400).json(new apiResponse(400, null, "You have already reviewed this product"));
    }

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      order: orderId || null,
      rating: Number(rating),
      title: title || "",
      comment: comment || "",
      images: images || [],
      isVerifiedPurchase,
    });

    await syncProductRating(productId);

    const populated = await review.populate("user", "name profilepic");
    return res.status(201).json(new apiResponse(201, populated, "Review submitted successfully"));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json(new apiResponse(400, null, "You have already reviewed this product"));
    }
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── PATCH /api/reviews/:reviewId ──────────────────────────────────────────
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findOne({ _id: reviewId, user: req.user._id });
    if (!review) return res.status(404).json(new apiResponse(404, null, "Review not found"));

    const { rating, title, comment, images } = req.body;
    if (rating  !== undefined) review.rating  = Number(rating);
    if (title   !== undefined) review.title   = title;
    if (comment !== undefined) review.comment = comment;
    if (images  !== undefined) review.images  = images;

    await review.save();
    await syncProductRating(review.product);

    return res.status(200).json(new apiResponse(200, review, "Review updated"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── DELETE /api/reviews/:reviewId ─────────────────────────────────────────
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const filter = { _id: reviewId };

    // Users can only delete their own; Admin can delete any
    if (req.user.role !== "Admin") filter.user = req.user._id;

    const review = await Review.findOneAndDelete(filter);
    if (!review) return res.status(404).json(new apiResponse(404, null, "Review not found"));

    await syncProductRating(review.product);
    return res.status(200).json(new apiResponse(200, null, "Review deleted"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── GET /api/reviews/all — Admin: all reviews with filters ────────────────
export const getAllReviews = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json(new apiResponse(403, null, "Admin only"));
    }

    const { page = 1, limit = 20, productId, rating, isApproved } = req.query;
    const filter = {};
    if (productId) filter.product = productId;
    if (rating)    filter.rating  = Number(rating);
    if (isApproved !== undefined) filter.isApproved = isApproved === "true";

    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user",    "name phone profilepic")
        .populate("product", "name image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json(
      new apiResponse(200, {
        reviews, total,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
      }, "Reviews fetched")
    );
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── PATCH /api/reviews/:reviewId/approve ─────────────────────────────────
export const toggleApproval = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json(new apiResponse(403, null, "Admin only"));
    }
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json(new apiResponse(404, null, "Review not found"));

    review.isApproved = !review.isApproved;
    await review.save();
    await syncProductRating(review.product);

    return res.status(200).json(new apiResponse(200, review, `Review ${review.isApproved ? "approved" : "hidden"}`));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};
