/**
 * FCM Push Notification Utility
 *
 * sendPushNotification({ token, title, body, data })
 *   → sends to a single device
 *
 * sendMulticastNotification({ tokens, title, body, data })
 *   → sends to multiple devices (up to 500 at a time)
 */

import { admin } from "../config/firebase.js";

/**
 * Send push notification to a single FCM token.
 *
 * @param {object} params
 * @param {string}  params.token   - FCM device token
 * @param {string}  params.title   - Notification title
 * @param {string}  params.body    - Notification body
 * @param {object}  [params.data]  - Extra key-value data (all values must be strings)
 * @returns {Promise<string|null>}  message ID or null on failure
 */
export const sendPushNotification = async ({ token, title, body, data = {} }) => {
  if (!token) return null;

  if (!admin.apps.length) {
    console.warn("[FCM] Firebase not initialized — skipping push");
    return null;
  }

  try {
    // Stringify all data values (FCM requirement)
    const stringData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );

    const message = {
      token,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "dukekart_orders",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] ✅ Sent to ${token.slice(0, 20)}... → ${response}`);
    return response;
  } catch (err) {
    // Token expired / invalid — caller should clear it
    if (
      err.code === "messaging/registration-token-not-registered" ||
      err.code === "messaging/invalid-registration-token"
    ) {
      console.warn(`[FCM] Invalid token: ${token.slice(0, 20)}...`);
      return "INVALID_TOKEN";
    }
    console.error("[FCM] Send error:", err.message);
    return null;
  }
};

/**
 * Send push notification to multiple FCM tokens (max 500).
 *
 * @param {object}   params
 * @param {string[]} params.tokens
 * @param {string}   params.title
 * @param {string}   params.body
 * @param {object}   [params.data]
 * @returns {Promise<{ successCount: number, failureCount: number }>}
 */
export const sendMulticastNotification = async ({ tokens, title, body, data = {} }) => {
  if (!tokens?.length) return { successCount: 0, failureCount: 0 };

  if (!admin.apps.length) {
    console.warn("[FCM] Firebase not initialized — skipping multicast");
    return { successCount: 0, failureCount: tokens.length };
  }

  try {
    const stringData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );

    // firebase-admin v12 uses sendEachForMulticast
    const message = {
      tokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "dukekart_orders" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Multicast → success: ${response.successCount}, failed: ${response.failureCount}`);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses:    response.responses,
    };
  } catch (err) {
    console.error("[FCM] Multicast error:", err.message);
    return { successCount: 0, failureCount: tokens.length };
  }
};
