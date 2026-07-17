import express from "express";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = express.Router();

router.use(verifyJWT); // All address routes need auth

router.get("/",                         getAddresses);
router.post("/",                        addAddress);
// ⚠️ specific route BEFORE generic :addressId route
router.patch("/:addressId/set-default", setDefaultAddress);
router.patch("/:addressId",             updateAddress);
router.delete("/:addressId",            deleteAddress);

export default router;
