import User from "../models/User.modal.js";
import Product from "../models/Product.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

// ── GET /api/wishlist ──────────────────────────────────────────────────────
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("wishlist")
      .populate("wishlist", "name image price originalPrice weight rating inStock isActive");

    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    // Filter out deleted/inactive products
    const items = user.wishlist.filter(p => p && p.isActive);

    return res.status(200).json(new apiResponse(200, items, "Wishlist fetched"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── POST /api/wishlist/toggle ──────────────────────────────────────────────
export const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json(new apiResponse(400, null, "Invalid productId"));
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json(new apiResponse(404, null, "Product not found"));

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    const idx = user.wishlist.findIndex(id => id.toString() === productId);
    let action;

    if (idx >= 0) {
      user.wishlist.splice(idx, 1);
      action = "removed";
    } else {
      user.wishlist.push(productId);
      action = "added";
    }

    await user.save();

    return res.status(200).json(
      new apiResponse(200, { wishlist: user.wishlist, action }, `Product ${action} ${action === "added" ? "to" : "from"} wishlist`)
    );
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── DELETE /api/wishlist/:productId ───────────────────────────────────────
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json(new apiResponse(400, null, "Invalid productId"));
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    return res.status(200).json(new apiResponse(200, user.wishlist, "Removed from wishlist"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};
