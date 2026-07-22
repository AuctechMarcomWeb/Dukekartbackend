import crypto from "crypto";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import Order from "../../models/Order/Order.modal.js";
import Product from "../../models/Product.modal.js";
import Coupon from "../../models/Coupon.modal.js";
import DeliverySlot from "../../models/DeliverySlot.modal.js";
import { createOrderNotification } from "../notificationController.js";

// ── Notification messages per status ─────────────────────────────────────────
const STATUS_NOTIFICATIONS = {
  "Confirmed":        { title: "✅ Order Confirmed",        msg: (id) => `Aapka order #${id} confirm ho gaya hai. Hum jaldi prepare karenge!` },
  "Processing":       { title: "👨‍🍳 Order Prepare Ho Raha Hai", msg: (id) => `#${id} ki packing shuru ho gayi hai.` },
  "Packed":           { title: "📦 Order Pack Ho Gaya",     msg: (id) => `Aapka order #${id} pack ho gaya aur dispatch ke liye ready hai.` },
  "Out for Delivery": { title: "🛵 Order Out for Delivery", msg: (id) => `Delivery boy aapke order #${id} ke saath aa raha hai. Thodi der mein pahunch jayega!` },
  "Delivered":        { title: "🎉 Order Deliver Ho Gaya",  msg: (id) => `Order #${id} successfully deliver ho gaya. Enjoy karein! App par rate zaroor karein. ⭐` },
  "Cancelled":        { title: "❌ Order Cancel Ho Gaya",   msg: (id) => `Aapka order #${id} cancel ho gaya hai. Koi issue ho toh support se contact karein.` },
  "Payment Failed":   { title: "⚠️ Payment Failed",         msg: (id) => `Order #${id} ki payment fail ho gayi. Dobara try karein ya doosra payment method use karein.` },
  "Payment Pending":  { title: "⏳ Payment Pending",        msg: (id) => `Order #${id} place ho gaya. Payment complete karein taaki order confirm ho sake.` },
};

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials missing in environment variables");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const success = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const failure = (res, statusCode, message, error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error?.message || error || null,
  });
};

const generateOrderId = async () => {
  const year = new Date().getFullYear();

  const lastOrder = await Order.findOne({
    orderId: new RegExp(`^ORD-${year}-`),
  })
    .sort({ createdAt: -1 })
    .select("orderId")
    .lean();

  let nextNumber = 1;

  if (lastOrder?.orderId) {
    const value = Number(lastOrder.orderId.split("-").pop());

    if (!Number.isNaN(value)) {
      nextNumber = value + 1;
    }
  }

  return `ORD-${year}-${String(nextNumber).padStart(6, "0")}`;
};

const roundAmount = (amount) => {
  return Number(Number(amount).toFixed(2));
};

const getVariant = (product, variantLabel) => {
  if (!variantLabel) return null;

  return product.weightVariants.find(
    (variant) =>
      variant.label?.trim().toLowerCase() ===
      variantLabel.trim().toLowerCase()
  );
};

const calculateOrderData = async ({
  items,
  couponCode,
  deliverySlotId,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order items are required");
  }

  if (!mongoose.Types.ObjectId.isValid(deliverySlotId)) {
    throw new Error("Invalid delivery slot");
  }

  const deliverySlot = await DeliverySlot.findOne({
    _id: deliverySlotId,
    isActive: true,
  });

  if (!deliverySlot) {
    throw new Error("Delivery slot not available");
  }

  const currentDay = new Date().toLocaleDateString("en-US", {
    weekday: "short",
  });

  if (!deliverySlot.availableDays.includes(currentDay)) {
    throw new Error("Delivery slot is not available today");
  }

  const calculatedItems = [];

  let itemTotal = 0;
  let productDiscount = 0;

  for (const requestedItem of items) {
    const product = await Product.findOne({
      _id: requestedItem.productId,
      isActive: true,
      inStock: true,
    });

    if (!product) {
      throw new Error("Product not found or inactive");
    }

    const quantity = Number(requestedItem.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for ${product.name}`);
    }

    if (product.stock < quantity) {
      throw new Error(
        `${product.name} has only ${product.stock} item(s) available`
      );
    }

    if (
      product.allowedSlots.length > 0 &&
      !product.allowedSlots.some(
        (slotId) => slotId.toString() === deliverySlotId.toString()
      )
    ) {
      throw new Error(
        `${product.name} is not available in selected delivery slot`
      );
    }

    let sellingPrice = product.price;
    let originalPrice = product.originalPrice || product.price;
    let variantLabel = product.weight || "";

    if (requestedItem.variantLabel) {
      const selectedVariant = getVariant(
        product,
        requestedItem.variantLabel
      );

      if (!selectedVariant) {
        throw new Error(
          `Variant ${requestedItem.variantLabel} not available for ${product.name}`
        );
      }

      sellingPrice = selectedVariant.price;
      originalPrice = selectedVariant.original || selectedVariant.price;
      variantLabel = selectedVariant.label;
    }

    const lineTotal = sellingPrice * quantity;
    const originalLineTotal = originalPrice * quantity;

    itemTotal += lineTotal;
    productDiscount += Math.max(
      0,
      originalLineTotal - lineTotal
    );

    calculatedItems.push({
      product: product._id,
      productName: product.name,
      productImage: product.image,
      variantLabel,
      quantity,
      price: sellingPrice,
      originalPrice,
      totalAmount: roundAmount(lineTotal),
    });
  }

  if (itemTotal < deliverySlot.minOrderAmount) {
    throw new Error(
      `Minimum order amount is ₹${deliverySlot.minOrderAmount}`
    );
  }

  let coupon = null;
  let couponDiscount = 0;

  if (couponCode?.trim()) {
    coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      active: true,
    });

    if (!coupon) {
      throw new Error("Invalid coupon code");
    }

    if (new Date() > coupon.expiry) {
      throw new Error("Coupon has expired");
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new Error("Coupon usage limit exhausted");
    }

    if (itemTotal < coupon.minOrder) {
      throw new Error(
        `Minimum amount for this coupon is ₹${coupon.minOrder}`
      );
    }

    if (coupon.type === "flat") {
      couponDiscount = coupon.value;
    }

    if (coupon.type === "percent") {
      couponDiscount = (itemTotal * coupon.value) / 100;

      if (coupon.maxDiscount > 0) {
        couponDiscount = Math.min(
          couponDiscount,
          coupon.maxDiscount
        );
      }
    }

    couponDiscount = Math.min(couponDiscount, itemTotal);
  }

  const deliveryCharge = deliverySlot.deliveryCharge || 0;
  const taxAmount = 0;
  const packagingCharge = 0;

  const finalAmount =
    itemTotal -
    couponDiscount +
    deliveryCharge +
    taxAmount +
    packagingCharge;

  return {
    items: calculatedItems,

    deliverySlot,

    coupon,

    amounts: {
      itemTotal: roundAmount(itemTotal),
      productDiscount: roundAmount(productDiscount),
      couponDiscount: roundAmount(couponDiscount),
      deliveryCharge: roundAmount(deliveryCharge),
      taxAmount: roundAmount(taxAmount),
      packagingCharge: roundAmount(packagingCharge),
      finalAmount: roundAmount(finalAmount),
    },
  };
};

export const previewOrder = async (req, res) => {
  try {
    const result = await calculateOrderData({
      items: req.body.items,
      couponCode: req.body.couponCode,
      deliverySlotId: req.body.deliverySlotId,
    });

    return success(
      res,
      200,
      "Order calculation completed",
      {
        items: result.items,

        deliverySlot: {
          id: result.deliverySlot._id,
          label: result.deliverySlot.label,
          time: result.deliverySlot.time,
          deliveryCharge: result.deliverySlot.deliveryCharge,
        },

        coupon: result.coupon
          ? {
              id: result.coupon._id,
              code: result.coupon.code,
              type: result.coupon.type,
              value: result.coupon.value,
            }
          : null,

        amounts: result.amounts,
      }
    );
  } catch (error) {
    return failure(res, 400, error.message, error);
  }
};

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user._id;

    const {
      items,
      deliveryAddress,
      deliverySlotId,
      couponCode,
      paymentMethod,
      customerNote,
    } = req.body;

    const validMethods = ["COD", "Razorpay", "PayU"];

    if (!validMethods.includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    if (
      !deliveryAddress?.fullName ||
      !deliveryAddress?.phone ||
      !deliveryAddress?.city ||
      !deliveryAddress?.state ||
      !deliveryAddress?.pinCode
    ) {
      throw new Error("Complete delivery address is required");
    }

    const calculation = await calculateOrderData({
      items,
      couponCode,
      deliverySlotId,
    });

    const orderId = await generateOrderId();

    const isCOD = paymentMethod === "COD";

    let gatewayOrderId = "";
    let gatewayData = null;

    /*
    |--------------------------------------------------------------------------
    | Razorpay order create
    |--------------------------------------------------------------------------
    */
    if (paymentMethod === "Razorpay") {
      gatewayData = await getRazorpay().orders.create({
        amount: Math.round(calculation.amounts.finalAmount * 100),
        currency: "INR",
        receipt: orderId,
        notes: {
          userId: userId.toString(),
          internalOrderId: orderId,
        },
      });

      gatewayOrderId = gatewayData.id;
    }

    /*
    |--------------------------------------------------------------------------
    | PayU case
    |--------------------------------------------------------------------------
    */
    if (paymentMethod === "PayU") {
      if (!process.env.PAYU_KEY || !process.env.PAYU_SALT) {
        throw new Error("PayU credentials missing in environment variables");
      }

      gatewayOrderId = `PAYU_${Date.now()}_${userId}`;

      const payuKey     = process.env.PAYU_KEY;
      const payuSalt    = process.env.PAYU_SALT;
      const amount      = calculation.amounts.finalAmount.toFixed(2);
      const productinfo = `DukekartOrder_${orderId}`;
      const firstname   = req.user.name || "Customer";
      const email       = req.user.email || "customer@dukekart.com";

      // PayU forward hash: key|txnid|amount|productinfo|firstname|email|||||||||||salt
      const hashString = `${payuKey}|${gatewayOrderId}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${payuSalt}`;
      const hash = crypto.createHash("sha512").update(hashString).digest("hex");

      gatewayData = {
        key:         payuKey,
        txnid:       gatewayOrderId,
        amount,
        productinfo,
        firstname,
        email,
        phone:       req.user.phone || "",
        surl:        `${process.env.APP_URL || "http://localhost:5000"}/api/orders/payment/payu/verify`,
        furl:        `${process.env.APP_URL || "http://localhost:5000"}/api/orders/payment/payu/verify`,
        hash,
        service_provider: "payu_paisa",
      };
    }

    const initialOrderStatus = isCOD
      ? "Confirmed"
      : "Payment Pending";

    const createdOrders = await Order.create(
      [
        {
          orderId,
          user: userId,
          items: calculation.items,

          deliveryAddress,

          deliverySlot: calculation.deliverySlot._id,

          deliverySlotDetails: {
            label: calculation.deliverySlot.label,
            time: calculation.deliverySlot.time,
            deliveryCharge:
              calculation.deliverySlot.deliveryCharge,
            color: calculation.deliverySlot.color,
          },

          coupon: calculation.coupon?._id || null,
          couponCode: calculation.coupon?.code || "",

          ...calculation.amounts,

          paymentMethod,
          paymentGateway: paymentMethod,
          paymentStatus: "Pending",

          gatewayOrderId,

          orderStatus: initialOrderStatus,

          statusHistory: [
            {
              status: initialOrderStatus,
              note: isCOD
                ? "COD order placed successfully"
                : "Waiting for online payment",
              updatedBy: userId,
              updatedByRole: "User",
            },
          ],

          customerNote: customerNote || "",

          stockStatus: "Reserved",

          stockReservationExpiresAt: isCOD
            ? null
            : new Date(Date.now() + 15 * 60 * 1000),
        },
      ],
      {
        session,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Stock reserve
    |--------------------------------------------------------------------------
    */
    for (const item of calculation.items) {
      const stockUpdate = await Product.updateOne(
        {
          _id: item.product,
          stock: {
            $gte: item.quantity,
          },
        },
        {
          $inc: {
            stock: -item.quantity,
          },
        },
        {
          session,
        }
      );

      if (stockUpdate.modifiedCount !== 1) {
        throw new Error(
          `Stock unavailable for ${item.productName}`
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Coupon reserve/use
    |--------------------------------------------------------------------------
    */
    if (calculation.coupon) {
      const couponUpdate = await Coupon.updateOne(
        {
          _id: calculation.coupon._id,
          active: true,
          usedCount: {
            $lt: calculation.coupon.usageLimit,
          },
        },
        {
          $inc: {
            usedCount: 1,
          },
        },
        {
          session,
        }
      );

      if (couponUpdate.modifiedCount !== 1) {
        throw new Error("Coupon is no longer available");
      }
    }

    await session.commitTransaction();

    const order = createdOrders[0];

    // ── Push notification after order placed ──────────────────────────────────
    const notifMeta = STATUS_NOTIFICATIONS[initialOrderStatus];
    if (notifMeta) {
      createOrderNotification(userId, notifMeta.title, notifMeta.msg(orderId), orderId);
    }

    return success(
      res,
      201,
      isCOD
        ? "COD order placed successfully"
        : "Online payment order created",
      {
        order,

        payment: isCOD
          ? null
          : {
              method: paymentMethod,
              gatewayOrderId,
              amount: calculation.amounts.finalAmount,
              razorpayKey:
                paymentMethod === "Razorpay"
                  ? process.env.RAZORPAY_KEY_ID
                  : undefined,
              gatewayData,
            },
      }
    );
  } catch (error) {
    await session.abortTransaction();

    return failure(res, 400, error.message, error);
  } finally {
    await session.endSession();
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const order = await Order.findOne({
      orderId,
      user: req.user._id,
      paymentMethod: "Razorpay",
    });

    if (!order) {
      return failure(res, 404, "Order not found");
    }

    if (order.paymentStatus === "Paid") {
      return success(
        res,
        200,
        "Payment already verified",
        order
      );
    }

    if (order.gatewayOrderId !== razorpay_order_id) {
      return failure(
        res,
        400,
        "Gateway order ID does not match"
      );
    }

    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      order.paymentStatus = "Failed";
      order.orderStatus = "Payment Failed";

      order.statusHistory.push({
        status: "Payment Failed",
        note: "Razorpay signature verification failed",
        updatedBy: req.user._id,
        updatedByRole: "User",
      });

      await order.save();

      // Notify user — payment failed
      createOrderNotification(
        order.user,
        STATUS_NOTIFICATIONS["Payment Failed"].title,
        STATUS_NOTIFICATIONS["Payment Failed"].msg(order.orderId),
        order.orderId
      );

      return failure(res, 400, "Payment verification failed");
    }

    order.paymentStatus = "Paid";
    order.orderStatus = "Confirmed";

    order.gatewayPaymentId = razorpay_payment_id;
    order.gatewaySignature = razorpay_signature;
    order.stockStatus = "Deducted";
    order.stockReservationExpiresAt = null;

    order.statusHistory.push({
      status: "Confirmed",
      note: "Razorpay payment verified successfully",
      updatedBy: req.user._id,
      updatedByRole: "User",
    });

    await order.save();

    // Notify user — payment successful, order confirmed
    createOrderNotification(
      order.user,
      STATUS_NOTIFICATIONS["Confirmed"].title,
      STATUS_NOTIFICATIONS["Confirmed"].msg(order.orderId),
      order.orderId
    );

    return success(res, 200, "Payment verified and order confirmed", order);
  } catch (error) {
    return failure(
      res,
      500,
      "Unable to verify payment",
      error
    );
  }
};

export const verifyPayUPayment = async (req, res) => {
  try {
    const {
      orderId,
      status,
      txnid,
      mihpayid,
      amount,
      hash,
      firstname,
      email,
      productinfo,
    } = req.body;

    const order = await Order.findOne({
      orderId,
      paymentMethod: "PayU",
    });

    if (!order) {
      return failure(res, 404, "Order not found");
    }

    if (order.gatewayOrderId !== txnid) {
      return failure(res, 400, "Transaction ID mismatch");
    }

    /*
    |--------------------------------------------------------------------------
    | Reverse hash
    |--------------------------------------------------------------------------
    | PayU documentation ke according exact reverse hash sequence use karein.
    */
    const reverseHashString =
      `${process.env.PAYU_SALT}|${status}|||||||||||` +
      `${email}|${firstname}|${productinfo}|${amount}|${txnid}|` +
      `${process.env.PAYU_KEY}`;

    const calculatedHash = crypto
      .createHash("sha512")
      .update(reverseHashString)
      .digest("hex");

    if (
      calculatedHash !== hash ||
      status !== "success"
    ) {
      order.paymentStatus = "Failed";
      order.orderStatus = "Payment Failed";

      order.gatewayResponse = req.body;

      order.statusHistory.push({
        status: "Payment Failed",
        note: "PayU payment verification failed",
        updatedByRole: "System",
      });

      await order.save();

      // Notify user — PayU payment failed
      createOrderNotification(
        order.user,
        STATUS_NOTIFICATIONS["Payment Failed"].title,
        STATUS_NOTIFICATIONS["Payment Failed"].msg(order.orderId),
        order.orderId
      );

      return failure(res, 400, "PayU payment verification failed");
    }

    order.paymentStatus = "Paid";
    order.orderStatus = "Confirmed";
    order.gatewayPaymentId = mihpayid;
    order.gatewayResponse = req.body;
    order.stockStatus = "Deducted";
    order.stockReservationExpiresAt = null;

    order.statusHistory.push({
      status: "Confirmed",
      note: "PayU payment verified successfully",
      updatedByRole: "System",
    });

    await order.save();

    // Notify user — PayU payment successful
    createOrderNotification(
      order.user,
      STATUS_NOTIFICATIONS["Confirmed"].title,
      STATUS_NOTIFICATIONS["Confirmed"].msg(order.orderId),
      order.orderId
    );

    return success(res, 200, "PayU payment verified successfully", order);
  } catch (error) {
    return failure(
      res,
      500,
      "Unable to verify PayU payment",
      error
    );
  }
};

export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      paymentStatus,
      deliverySlotId,
      fromDate,
      toDate,
    } = req.query;

    const currentPage = Math.max(1, Number(page));
    const pageSize = Math.max(1, Number(limit));
    const skip = (currentPage - 1) * pageSize;

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Role-wise filtering
    |--------------------------------------------------------------------------
    */
    if (req.user.role === "User") {
      filter.user = req.user._id;
    }

    if (status) {
      filter.orderStatus = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (
      deliverySlotId &&
      mongoose.Types.ObjectId.isValid(deliverySlotId)
    ) {
      filter.deliverySlot = deliverySlotId;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        filter.createdAt.$lte = endDate;
      }
    }

    if (search?.trim()) {
      const searchText = search.trim();

      filter.$or = [
        {
          orderId: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          "items.productName": {
            $regex: searchText,
            $options: "i",
          },
        },
      ];

      // Admin customer name and phone search
      if (req.user.role === "Admin") {
        const userIds = await mongoose
          .model("User")
          .find({
            $or: [
              {
                name: {
                  $regex: searchText,
                  $options: "i",
                },
              },
              {
                phone: {
                  $regex: searchText,
                  $options: "i",
                },
              },
            ],
          })
          .distinct("_id");

        filter.$or.push({
          user: {
            $in: userIds,
          },
        });
      }
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate(
          "user",
          "name phone email profilepic"
        )
        .populate(
          "deliverySlot",
          "label time color deliveryCharge"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),

      Order.countDocuments(filter),
    ]);

    return success(res, 200, "Orders fetched", {
      orders,

      pagination: {
        currentPage,
        pageSize,
        totalOrders,
        totalPages: Math.ceil(totalOrders / pageSize),
      },
    });
  } catch (error) {
    return failure(
      res,
      500,
      "Unable to fetch orders",
      error
    );
  }
};


export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const filter = {
      orderId,
    };

    if (req.user.role === "User") {
      filter.user = req.user._id;
    }

    const order = await Order.findOne(filter)
      .populate(
        "user",
        "name phone email profilepic"
      )
      .populate(
        "deliverySlot",
        "label time color deliveryCharge"
      )
      .populate(
        "coupon",
        "code type value desc"
      )
      .populate(
        "statusHistory.updatedBy",
        "name role"
      )
      .lean();

    if (!order) {
      return failure(res, 404, "Order not found");
    }

    return success(
      res,
      200,
      "Order fetched successfully",
      order
    );
  } catch (error) {
    return failure(
      res,
      500,
      "Unable to fetch order",
      error
    );
  }
};

const STATUS_TRANSITIONS = {
  "Payment Pending": [
    "Confirmed",
    "Payment Failed",
    "Cancelled",
  ],

  "Payment Failed": ["Cancelled"],

  Confirmed: [
    "Processing",
    "Cancelled",
  ],

  Processing: [
    "Packed",
    "Cancelled",
  ],

  Packed: ["Out for Delivery"],

  "Out for Delivery": ["Delivered"],

  Delivered: [],

  Cancelled: [],
};

export const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return failure(
        res,
        403,
        "Only admin can update order status"
      );
    }

    const { orderId } = req.params;
    const { status, note } = req.body;

    const order = await Order.findOne({
      orderId,
    });

    if (!order) {
      return failure(res, 404, "Order not found");
    }

    const allowedNextStatuses =
      STATUS_TRANSITIONS[order.orderStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return failure(
        res,
        400,
        `Order cannot move from ${order.orderStatus} to ${status}`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Online order cannot process before payment
    |--------------------------------------------------------------------------
    */
    if (
      order.paymentMethod !== "COD" &&
      order.paymentStatus !== "Paid" &&
      ["Confirmed", "Processing", "Packed", "Out for Delivery"].includes(
        status
      )
    ) {
      return failure(
        res,
        400,
        "Online payment is not completed"
      );
    }

    if (status === "Delivered") {
      order.deliveredAt = new Date();

      // COD payment collect hone ke baad paid
      if (order.paymentMethod === "COD") {
        order.paymentStatus = "Paid";
      }
    }

    order.orderStatus = status;

    order.statusHistory.push({
      status,
      note: note || `Order status updated to ${status}`,
      updatedBy: req.user._id,
      updatedByRole: "Admin",
    });

    await order.save();

    // ── Notify customer about status change ───────────────────────────────────
    const notifMeta = STATUS_NOTIFICATIONS[status];
    if (notifMeta && order.user) {
      createOrderNotification(order.user, notifMeta.title, notifMeta.msg(order.orderId), order.orderId);
    }

    return success(res, 200, "Order status updated successfully", order);
  } catch (error) {
    return failure(
      res,
      500,
      "Unable to update order status",
      error
    );
  }
};

export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { orderId } = req.params;
    const { reason } = req.body;

    const filter = {
      orderId,
    };

    if (req.user.role === "User") {
      filter.user = req.user._id;
    }

    const order = await Order.findOne(filter).session(
      session
    );

    if (!order) {
      throw new Error("Order not found");
    }

    const userAllowedStatuses = [
      "Payment Pending",
      "Payment Failed",
      "Confirmed",
    ];

    const adminAllowedStatuses = [
      "Payment Pending",
      "Payment Failed",
      "Confirmed",
      "Processing",
    ];

    const allowedStatuses =
      req.user.role === "Admin"
        ? adminAllowedStatuses
        : userAllowedStatuses;

    if (!allowedStatuses.includes(order.orderStatus)) {
      throw new Error(
        `Order cannot be cancelled at ${order.orderStatus} stage`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Restore stock
    |--------------------------------------------------------------------------
    */
    if (
      ["Reserved", "Deducted"].includes(
        order.stockStatus
      )
    ) {
      for (const item of order.items) {
        await Product.updateOne(
          {
            _id: item.product,
          },
          {
            $inc: {
              stock: item.quantity,
            },
          },
          {
            session,
          }
        );
      }

      order.stockStatus = "Restored";
    }

    /*
    |--------------------------------------------------------------------------
    | Restore coupon count
    |--------------------------------------------------------------------------
    */
    if (order.coupon) {
      await Coupon.updateOne(
        {
          _id: order.coupon,
          usedCount: {
            $gt: 0,
          },
        },
        {
          $inc: {
            usedCount: -1,
          },
        },
        {
          session,
        }
      );
    }

    order.orderStatus = "Cancelled";
    order.cancellationReason =
      reason || `Cancelled by ${req.user.role}`;
    order.cancelledBy = req.user.role;
    order.cancelledAt = new Date();

    order.statusHistory.push({
      status: "Cancelled",
      note: order.cancellationReason,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
    });

    await order.save({
      session,
    });

    await session.commitTransaction();

    // ── Notify customer about cancellation ────────────────────────────────────
    createOrderNotification(
      order.user,
      STATUS_NOTIFICATIONS["Cancelled"].title,
      STATUS_NOTIFICATIONS["Cancelled"].msg(order.orderId),
      order.orderId
    );

    return success(res, 200, "Order cancelled successfully", order);
  } catch (error) {
    await session.abortTransaction();

    return failure(res, 400, error.message, error);
  } finally {
    await session.endSession();
  }
};

export const getOrderStats = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return failure(
        res,
        403,
        "Only admin can access order statistics"
      );
    }

    const result = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const stats = {
      paymentPending: 0,
      confirmed: 0,
      processing: 0,
      packed: 0,
      outForDelivery: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const item of result) {
      switch (item._id) {
        case "Payment Pending":
          stats.paymentPending = item.count;
          break;

        case "Confirmed":
          stats.confirmed = item.count;
          break;

        case "Processing":
          stats.processing = item.count;
          break;

        case "Packed":
          stats.packed = item.count;
          break;

        case "Out for Delivery":
          stats.outForDelivery = item.count;
          break;

        case "Delivered":
          stats.delivered = item.count;
          break;

        case "Cancelled":
          stats.cancelled = item.count;
          break;

        default:
          break;
      }
    }

    return success(
      res,
      200,
      "Order statistics fetched",
      stats
    );
  } catch (error) {
    return failure(
      res,
      500,
      "Unable to fetch order statistics",
      error
    );
  }
};