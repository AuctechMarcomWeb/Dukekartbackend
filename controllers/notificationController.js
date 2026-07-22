import Notification from "../models/Notification.modal.js";
import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { sendPushNotification, sendMulticastNotification } from "../utils/sendPushNotification.js";

// ── GET /api/notifications — user's own + broadcasts ──────────────────────
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find({
      $or: [
        { user: req.user._id },
        { isBroadcast: true },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Merge isRead: for broadcasts check readBy array
    const userId = req.user._id.toString();
    const mapped = notifications.map(n => ({
      ...n,
      isRead: n.isBroadcast
        ? n.readBy.some(id => id.toString() === userId)
        : n.isRead,
    }));

    const unreadCount = mapped.filter(n => !n.isRead).length;

    return res.status(200).json(
      new apiResponse(200, { notifications: mapped, unreadCount }, "Notifications fetched")
    );
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── PATCH /api/notifications/:id/read ────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json(new apiResponse(404, null, "Notification not found"));

    if (notification.isBroadcast) {
      // Add user to readBy if not already present
      if (!notification.readBy.some(id => id.toString() === req.user._id.toString())) {
        notification.readBy.push(req.user._id);
        await notification.save();
      }
    } else {
      // Personal notification — verify ownership
      if (notification.user.toString() !== req.user._id.toString()) {
        return res.status(403).json(new apiResponse(403, null, "Forbidden"));
      }
      notification.isRead = true;
      await notification.save();
    }

    return res.status(200).json(new apiResponse(200, null, "Marked as read"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── PATCH /api/notifications/read-all ────────────────────────────────────
export const markAllRead = async (req, res) => {
  try {
    // Personal notifications
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    // Broadcasts: add user to readBy for all unread broadcasts
    const broadcasts = await Notification.find({
      isBroadcast: true,
      readBy: { $ne: req.user._id },
    });
    for (const b of broadcasts) {
      b.readBy.push(req.user._id);
      await b.save();
    }

    return res.status(200).json(new apiResponse(200, null, "All notifications marked as read"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── POST /api/notifications/send — Admin sends notification ──────────────
export const sendNotification = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json(new apiResponse(403, null, "Admin only"));
    }

    const { userId, title, message, type, orderId, broadcast } = req.body;

    if (!title || !message) {
      return res.status(400).json(new apiResponse(400, null, "title and message are required"));
    }

    const isBroadcast = broadcast === true || broadcast === "true";

    if (!isBroadcast && !userId) {
      return res.status(400).json(new apiResponse(400, null, "userId required for non-broadcast notifications"));
    }

    // ── Save to DB ────────────────────────────────────────────────────────
    const notification = await Notification.create({
      user: isBroadcast ? null : userId,
      title,
      message,
      type: type || "system",
      orderId: orderId || "",
      isBroadcast,
    });

    // ── Send FCM Push ─────────────────────────────────────────────────────
    const pushData = {
      type:    type || "system",
      orderId: orderId || "",
      notificationId: notification._id.toString(),
    };

    if (isBroadcast) {
      // Fetch all users with an fcmToken
      const users = await User.find({ fcmToken: { $exists: true, $ne: "" } })
        .select("fcmToken")
        .lean();
      const tokens = users.map(u => u.fcmToken).filter(Boolean);
      if (tokens.length > 0) {
        await sendMulticastNotification({ tokens, title, body: message, data: pushData });
      }
    } else {
      const targetUser = await User.findById(userId).select("fcmToken").lean();
      if (targetUser?.fcmToken) {
        const result = await sendPushNotification({
          token: targetUser.fcmToken,
          title,
          body: message,
          data: pushData,
        });
        // Clear invalid token from DB
        if (result === "INVALID_TOKEN") {
          await User.findByIdAndUpdate(userId, { $unset: { fcmToken: "" } });
        }
      }
    }

    return res.status(201).json(new apiResponse(201, notification, "Notification sent"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── DELETE /api/notifications/:id — Admin only ────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json(new apiResponse(403, null, "Admin only"));
    }
    await Notification.findByIdAndDelete(req.params.id);
    return res.status(200).json(new apiResponse(200, null, "Notification deleted"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── Helper: create notification internally (called from orderController) ──
export const createOrderNotification = async (userId, title, message, orderId = "") => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type: "order",
      orderId,
      isBroadcast: false,
    });

    // Send FCM push to user's device
    const user = await User.findById(userId).select("fcmToken").lean();
    if (user?.fcmToken) {
      const result = await sendPushNotification({
        token: user.fcmToken,
        title,
        body: message,
        data: { type: "order", orderId: String(orderId) },
      });
      if (result === "INVALID_TOKEN") {
        await User.findByIdAndUpdate(userId, { $unset: { fcmToken: "" } });
      }
    }
  } catch (_) {
    // Non-critical — don't throw
  }
};
