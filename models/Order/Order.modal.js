import mongoose from "mongoose";

const ORDER_STATUS = [
  "Payment Pending",
  "Payment Failed",
  "Confirmed",
  "Processing",
  "Packed",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const PAYMENT_STATUS = [
  "Pending",
  "Paid",
  "Failed",
  "Refunded",
];

const PAYMENT_METHOD = [
  "COD",
  "Razorpay",
  "PayU",
];

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Snapshot fields
    productName: {
      type: String,
      required: true,
    },

    productImage: {
      type: String,
      default: "",
    },

    variantLabel: {
      type: String,
      default: "",
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    originalPrice: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    houseNo: {
      type: String,
      default: "",
      trim: true,
    },

    street: {
      type: String,
      default: "",
      trim: true,
    },

    landmark: {
      type: String,
      default: "",
      trim: true,
    },

    area: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    pinCode: {
      type: String,
      required: true,
      trim: true,
    },

    addressType: {
      type: String,
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUS,
      required: true,
    },

    note: {
      type: String,
      default: "",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedByRole: {
      type: String,
      enum: ["User", "Admin", "System"],
      default: "System",
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one item is required",
      },
    },

    deliveryAddress: {
      type: addressSchema,
      required: true,
    },

    deliverySlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliverySlot",
      required: true,
    },

    // Slot snapshot
    deliverySlotDetails: {
      label: {
        type: String,
        required: true,
      },

      time: {
        type: String,
        required: true,
      },

      deliveryCharge: {
        type: Number,
        default: 0,
      },

      color: {
        type: String,
        default: "#D4AF37",
      },
    },

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    couponCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },

    itemTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    productDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    packagingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHOD,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      default: "Pending",
      index: true,
    },

    paymentGateway: {
      type: String,
      enum: ["COD", "Razorpay", "PayU"],
      required: true,
    },

    gatewayOrderId: {
      type: String,
      default: "",
      index: true,
    },

    gatewayPaymentId: {
      type: String,
      default: "",
      index: true,
    },

    gatewaySignature: {
      type: String,
      default: "",
    },

    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    orderStatus: {
      type: String,
      enum: ORDER_STATUS,
      default: "Payment Pending",
      index: true,
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    customerNote: {
      type: String,
      default: "",
    },

    cancellationReason: {
      type: String,
      default: "",
    },

    cancelledBy: {
      type: String,
      enum: ["", "User", "Admin", "System"],
      default: "",
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    stockStatus: {
      type: String,
      enum: ["Not Reserved", "Reserved", "Deducted", "Restored"],
      default: "Not Reserved",
    },

    stockReservationExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;