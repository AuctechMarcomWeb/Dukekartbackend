import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    // Coupon code e.g. "DUKE50" — unique, stored uppercase
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // "flat" = fixed ₹ off  |  "percent" = % off
    type: {
      type: String,
      enum: ["flat", "percent"],
      required: true,
      default: "flat",
    },

    // Discount amount — ₹ for flat, % for percent
    value: {
      type: Number,
      required: true,
      min: 0,
    },

    // Minimum cart value required to apply this coupon
    minOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Cap on discount for percent type (ignored for flat)
    maxDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total number of times this coupon can be used across all users
    usageLimit: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Counter incremented each time coupon is successfully applied
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Short description shown on the coupon card
    desc: {
      type: String,
      trim: true,
      default: "",
    },

    // Expiry date — coupon cannot be used after this date
    expiry: {
      type: Date,
      required: true,
    },

    // Whether this coupon is visible and usable
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Virtual: is this coupon currently valid (active + not expired + usage not exhausted)
couponSchema.virtual("isValid").get(function () {
  return (
    this.active &&
    new Date() <= this.expiry &&
    this.usedCount < this.usageLimit
  );
});

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
