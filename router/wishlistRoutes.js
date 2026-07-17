import express from "express";
import {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/",                    getWishlist);
router.post("/toggle",             toggleWishlist);
router.delete("/:productId",       removeFromWishlist);

export default router;
