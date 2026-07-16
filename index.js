import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import authRoutes from "./router/authRoutes.js";
import uploadRoutes from "./router/uploadRoutes.js";
import homeSliderRoutes from "./router/homeSliderRoutes.js";
import dashboardRoutes from "./router/dashboardRoutes.js";
import categoryRoutes from "./router/categoryRoutes.js";
import productRoutes       from "./router/productRoutes.js";
import deliverySlotRoutes  from "./router/deliverySlotRoutes.js";
import couponRoutes        from "./router/couponRoutes.js";

dotenv.config();

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// credentials:true requires an explicit origin — "*" won't work with cookies/auth headers
const rawOrigins = process.env.CLIENT_URL || "http://localhost:3000,http://localhost:5173";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "x-tenant-id"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/upload",       uploadRoutes);
app.use("/api/homeSlider",   homeSliderRoutes);
app.use("/api/dashboard",    dashboardRoutes);
app.use("/api/category",     categoryRoutes);
app.use("/api/product",      productRoutes);
app.use("/api/deliverySlot", deliverySlotRoutes);
app.use("/api/coupon",       couponRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
