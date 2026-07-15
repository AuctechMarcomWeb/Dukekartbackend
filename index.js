import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import authRoutes from "./router/authRoutes.js";
import uploadRoutes from "./router/uploadRoutes.js";
import homeSliderRoutes from "./router/homeSliderRoutes.js";
import dashboardRoutes from "./router/dashboardRoutes.js";
import { generalLimiter, authLimiter } from "./middlewares/rateLimiter.js";
// Load environment variables
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
app.use(
  cors({
    // origin: clientUrl || "*",
    origin: clientUrl || "http://localhost:5173",
    credentials: true,
  }),
);

// app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rate Limiters
// app.use("/api/auth", authLimiter);   // strict — OTP/login routes
// app.use("/api", generalLimiter);     // general — baaki sab routes

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/homeSlider", homeSliderRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;
// Start the server and connect to the database
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
