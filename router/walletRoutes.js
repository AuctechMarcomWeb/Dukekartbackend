import express from "express";
import {
  getWallet,
  addMoney,
  deductWallet,
  creditCashback,
} from "../controllers/walletController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/",                getWallet);
router.post("/add",            addMoney);
router.post("/deduct",         deductWallet);
router.post("/credit-cashback", creditCashback); // Admin only

export default router;
