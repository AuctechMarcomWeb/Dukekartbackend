import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const addressSchema = new mongoose.Schema(
  {
    fullName:    { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    houseNo:     { type: String, default: "", trim: true },
    street:      { type: String, default: "", trim: true },
    landmark:    { type: String, default: "", trim: true },
    area:        { type: String, default: "", trim: true },
    city:        { type: String, required: true, trim: true },
    state:       { type: String, required: true, trim: true },
    pinCode:     { type: String, required: true, trim: true },
    addressType: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    isDefault:   { type: Boolean, default: false },
    latitude:    { type: Number, default: null },
    longitude:   { type: Number, default: null },
  },
  { timestamps: true }
);

const walletTransactionSchema = new mongoose.Schema(
  {
    type:        { type: String, enum: ["credit", "debit"], required: true },
    amount:      { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    orderId:     { type: String, default: "" },
    refId:       { type: String, default: "" },
    status:      { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    otp:   { type: String },
    isNew: { type: Boolean, default: true, required: true },
    otpExpiration: { type: Date },

    name:       { type: String },
    gender:     { type: String },
    role:       { type: String, enum: ["User", "Admin"], default: "User", required: true },
    dob:        { type: Date },
    email:      { type: String, trim: true, lowercase: true },
    profilepic: { type: String },
    occupation: { type: String },

    // Legacy single address (kept for backward compat)
    address: { type: String },

    // ── Addresses Array ────────────────────────────────────────
    addresses: {
      type: [addressSchema],
      default: [],
    },

    // ── Wallet ─────────────────────────────────────────────────
    walletBalance: { type: Number, default: 0, min: 0 },
    walletTransactions: {
      type: [walletTransactionSchema],
      default: [],
    },

    // ── Wishlist ────────────────────────────────────────────────
    wishlist: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" }
    ],

    // ── Misc ────────────────────────────────────────────────────
    activeStatus: { type: Boolean, default: true },
    password:     { type: String },
    fcmToken:     { type: String },
    authToken:    { type: String },
  },
  { timestamps: true }
);

UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { userId: this._id, role: this.role },
    process.env.JWT_SECRET
  );
  return token;
};

const User = mongoose.model("User", UserSchema);

export default User;
