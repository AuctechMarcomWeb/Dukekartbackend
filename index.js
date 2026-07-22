import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import { initFirebase } from "./config/firebase.js";
import authRoutes         from "./router/authRoutes.js";
import uploadRoutes       from "./router/uploadRoutes.js";
import homeSliderRoutes   from "./router/homeSliderRoutes.js";
import dashboardRoutes    from "./router/dashboardRoutes.js";
import categoryRoutes     from "./router/categoryRoutes.js";
import productRoutes      from "./router/productRoutes.js";
import deliverySlotRoutes from "./router/deliverySlotRoutes.js";
import couponRoutes       from "./router/couponRoutes.js";
import orderRoutes        from "./router/Order/orderRoutes.js";
import addressRoutes      from "./router/addressRoutes.js";
import walletRoutes       from "./router/walletRoutes.js";
import wishlistRoutes     from "./router/wishlistRoutes.js";
import reviewRoutes       from "./router/reviewRoutes.js";
import notificationRoutes from "./router/notificationRoutes.js";
import { startCronJobs }  from "./utils/cronJobs.js";
dotenv.config();

const app = express();

// CORS Configuration

// ARV-backend/index.js
// const allowedOrigins = [
//   "http://localhost:5173", // admin (React)
//   "http://localhost:5500", // website (Live Server)
//   "http://127.0.0.1:5500", // website (alternate)
//   process.env.CLIENT_URL,
// ].filter(Boolean);

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   }),
// );

const clientUrl = process.env.CLIENT_URL;

const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://192.168.1.29:3000",
  "http://192.168.1.29:3001",
];

const corsOrigin = (!clientUrl || clientUrl === "*")
  ? defaultCorsOrigins
  : [...new Set([...defaultCorsOrigins, ...clientUrl.split(",").map((o) => o.trim()).filter(Boolean)])];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return corsOrigin.includes(origin) || /^http:\/\/192\.168\.[0-9]+\.[0-9]+:\d+$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "x-tenant-id"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200,
  })
);


// app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/upload",        uploadRoutes);
app.use("/api/homeSlider",    homeSliderRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/category",      categoryRoutes);
app.use("/api/product",       productRoutes);
app.use("/api/deliverySlot",  deliverySlotRoutes);
app.use("/api/coupon",        couponRoutes);
app.use("/api/orders",        orderRoutes);
app.use("/api/address",       addressRoutes);
app.use("/api/wallet",        walletRoutes);
app.use("/api/wishlist",      wishlistRoutes);
app.use("/api/reviews",       reviewRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
  startCronJobs();
  initFirebase();
});
