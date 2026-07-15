// config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // console.log("🔗 Connecting to MongoDB...", process.env.MONGO_URI);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
  }
};

export default connectDB;
