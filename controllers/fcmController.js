/**
 * FCM Token Controller
 *
 * POST   /api/auth/fcm-token   — save/update device FCM token
 * DELETE /api/auth/fcm-token   — remove FCM token on logout
 */

import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";

/**
 * Save or update FCM token for the logged-in user.
 * Called from app on login / app foreground.
 */
export const saveFCMToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(new apiResponse(400, null, "FCM token is required"));
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { fcmToken: token },
      { new: true }
    );

    return res.status(200).json(new apiResponse(200, null, "FCM token saved"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

/**
 * Remove FCM token on logout so no push is delivered to signed-out device.
 */
export const deleteFCMToken = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { fcmToken: "" } }
    );
    return res.status(200).json(new apiResponse(200, null, "FCM token removed"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};
