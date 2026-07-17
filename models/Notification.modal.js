import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,   // null = broadcast to all users
      index: true,
    },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["order", "promo", "delivery", "system", "wallet"],
      default: "system",
    },
    orderId: { type: String, default: "" },
    isRead:  { type: Boolean, default: false },
    isBroadcast: { type: Boolean, default: false },
    // Track which users have read a broadcast
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ isBroadcast: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
