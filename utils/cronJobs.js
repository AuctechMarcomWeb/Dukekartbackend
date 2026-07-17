import cron from "node-cron";
import mongoose from "mongoose";
import Order from "../models/Order/Order.modal.js";
import Product from "../models/Product.modal.js";

/**
 * Every 5 minutes: find all "Payment Pending" orders whose stock reservation
 * has expired and cancel them, restoring stock.
 */
export const startCronJobs = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const expiredOrders = await Order.find({
        orderStatus: "Payment Pending",
        stockStatus: "Reserved",
        stockReservationExpiresAt: { $lte: new Date() },
      });

      if (expiredOrders.length === 0) return;

      console.log(`[CRON] Processing ${expiredOrders.length} expired stock reservation(s)...`);

      for (const order of expiredOrders) {
        const session = await mongoose.startSession();
        try {
          session.startTransaction();

          // Restore stock for each item
          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.product },
              { $inc: { stock: item.quantity } },
              { session }
            );
          }

          order.orderStatus = "Cancelled";
          order.stockStatus = "Restored";
          order.cancellationReason = "Payment timeout — stock reservation expired";
          order.cancelledBy = "System";
          order.cancelledAt = new Date();
          order.stockReservationExpiresAt = null;

          order.statusHistory.push({
            status: "Cancelled",
            note: "Auto-cancelled: payment not received within 15 minutes",
            updatedByRole: "System",
          });

          await order.save({ session });
          await session.commitTransaction();

          console.log(`[CRON] Order ${order.orderId} auto-cancelled and stock restored`);
        } catch (err) {
          await session.abortTransaction();
          console.error(`[CRON] Failed to process order ${order.orderId}:`, err.message);
        } finally {
          await session.endSession();
        }
      }
    } catch (err) {
      console.error("[CRON] Stock expiry cron error:", err.message);
    }
  });

  console.log("[CRON] Stock expiry cron job started (runs every 5 minutes)");
};
