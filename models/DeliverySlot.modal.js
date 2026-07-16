import mongoose from "mongoose";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const deliverySlotSchema = new mongoose.Schema(
  {
    // Slot display label e.g. "Morning", "Noon", "Evening"
    label: {
      type: String,
      required: true,
      trim: true,
    },

    // Time range string e.g. "7:00 AM – 10:00 AM"
    time: {
      type: String,
      required: true,
      trim: true,
    },

    // Max orders allowed in this slot per day
    maxOrders: {
      type: Number,
      default: 50,
      min: 1,
    },

    // Delivery charge in rupees — 0 means FREE
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Minimum order amount to place in this slot — 0 means no minimum
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Days this slot is available
    availableDays: {
      type: [String],
      enum: DAYS,
      default: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },

    // Display color for UI (hex code) e.g. "#D4AF37"
    color: {
      type: String,
      trim: true,
      default: "#D4AF37",
    },

    // Whether this slot is visible to customers
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const DeliverySlot = mongoose.model("DeliverySlot", deliverySlotSchema);
export default DeliverySlot;
