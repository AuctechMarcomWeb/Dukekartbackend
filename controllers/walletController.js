import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";

// ── GET /api/wallet ────────────────────────────────────────────────────────
export const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("walletBalance walletTransactions");
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    // Sort transactions latest first
    const transactions = [...user.walletTransactions].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json(
      new apiResponse(200, { balance: user.walletBalance, transactions }, "Wallet fetched")
    );
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── POST /api/wallet/add ───────────────────────────────────────────────────
// User adds money via Razorpay/UPI (after payment verify, call this internally)
export const addMoney = async (req, res) => {
  try {
    const { amount, refId, description } = req.body;
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      return res.status(400).json(new apiResponse(400, null, "Valid amount is required"));
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    user.walletBalance = Number((user.walletBalance + amt).toFixed(2));
    user.walletTransactions.push({
      type: "credit",
      amount: amt,
      description: description || "Money added to wallet",
      refId: refId || "",
      status: "completed",
    });

    await user.save();

    return res.status(200).json(
      new apiResponse(200, { balance: user.walletBalance }, "Money added to wallet")
    );
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── POST /api/wallet/deduct ────────────────────────────────────────────────
// Internal use: deduct wallet during order placement
export const deductWallet = async (req, res) => {
  try {
    const { amount, orderId, description } = req.body;
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      return res.status(400).json(new apiResponse(400, null, "Valid amount is required"));
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    if (user.walletBalance < amt) {
      return res.status(400).json(new apiResponse(400, null, "Insufficient wallet balance"));
    }

    user.walletBalance = Number((user.walletBalance - amt).toFixed(2));
    user.walletTransactions.push({
      type: "debit",
      amount: amt,
      description: description || `Order payment: ${orderId}`,
      orderId: orderId || "",
      status: "completed",
    });

    await user.save();

    return res.status(200).json(
      new apiResponse(200, { balance: user.walletBalance }, "Wallet debited successfully")
    );
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── POST /api/wallet/credit-cashback ──────────────────────────────────────
// Admin or system credits cashback after order delivery
export const creditCashback = async (req, res) => {
  try {
    const { userId, amount, orderId, description } = req.body;

    if (req.user.role !== "Admin") {
      return res.status(403).json(new apiResponse(403, null, "Only admin can credit cashback"));
    }

    const amt = Number(amount);
    if (!amt || amt <= 0 || !userId) {
      return res.status(400).json(new apiResponse(400, null, "userId and valid amount required"));
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    user.walletBalance = Number((user.walletBalance + amt).toFixed(2));
    user.walletTransactions.push({
      type: "credit",
      amount: amt,
      description: description || `Cashback for order: ${orderId}`,
      orderId: orderId || "",
      status: "completed",
    });

    await user.save();

    return res.status(200).json(
      new apiResponse(200, { balance: user.walletBalance }, "Cashback credited")
    );
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};
