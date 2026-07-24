import express from "express";
import {
  getWishlist,
  getAllWishlists,
  adminRemoveFromWishlist,
  toggleWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import { verifyJWT, authorizeUserType } from "../middlewares/authTypeMiddleware.js";

const router = express.Router();

router.use(verifyJWT);

// Admin: get all users' wishlist items with customer info
router.get("/admin/all", authorizeUserType("Admin"), getAllWishlists);

// Admin: remove a product from a specific user's wishlist
router.delete("/admin/:userId/:productId", authorizeUserType("Admin"), adminRemoveFromWishlist);

router.get("/",                    getWishlist);
router.post("/toggle",             toggleWishlist);
router.delete("/:productId",       removeFromWishlist);

export default router;
