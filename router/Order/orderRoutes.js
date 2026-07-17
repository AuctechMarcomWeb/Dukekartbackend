import express from "express";

import {
  previewOrder,
  createOrder,
  verifyRazorpayPayment,
  verifyPayUPayment,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
} from "../../controllers/Order/orderController.js";

import {
  authorizeUserType,
  verifyJWT,
} from "../../middlewares/authTypeMiddleware.js";


const router = express.Router();

/*
|--------------------------------------------------------------------------
| All authenticated User/Admin routes
|--------------------------------------------------------------------------
*/

router.post("/preview", verifyJWT, previewOrder);

router.post("/", verifyJWT, createOrder);

router.get("/", verifyJWT, getOrders);

router.get("/stats", verifyJWT, getOrderStats);

router.get("/:orderId", verifyJWT, getOrderById);

router.patch(
  "/:orderId/cancel",
  verifyJWT,
  cancelOrder
);

router.patch(
  "/:orderId/status",
  verifyJWT,
  updateOrderStatus
);

router.post(
  "/payment/razorpay/verify",
  verifyJWT,
  verifyRazorpayPayment
);

/*
|--------------------------------------------------------------------------
| PayU callback may be public because PayU server calls it
|--------------------------------------------------------------------------
*/
router.post(
  "/payment/payu/verify",
  verifyPayUPayment
);

export default router;