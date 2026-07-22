/**
 * Firebase Admin SDK initialization
 *
 * Setup steps (Firebase Console):
 *  1. Project Settings → Service Accounts → Generate new private key
 *  2. Add these values to your .env file:
 *       FIREBASE_PROJECT_ID=your-project-id
 *       FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
 *       FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n"
 */

import admin from "firebase-admin";

let initialized = false;

const initFirebase = () => {
  if (initialized) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firebase] ⚠️  Credentials missing — push notifications disabled.\n" +
      "   Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to .env"
    );
    return;
  }

  try {
    // Check if already initialized (hot-reload safe)
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Render / Railway env mein literal \n aata h, replace karo
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    }
    initialized = true;
    console.log("[Firebase] ✅ Admin SDK initialized successfully");
  } catch (err) {
    console.error("[Firebase] ❌ Initialization failed:", err.message);
  }
};

export { admin, initFirebase };
