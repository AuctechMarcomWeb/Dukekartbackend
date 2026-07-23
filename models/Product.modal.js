import mongoose from "mongoose";

const STATUSES = ["Active", "Inactive", "Low Stock", "Out of Stock"];

const weightVariantSchema = new mongoose.Schema(
  {
    label:    { type: String, trim: true },   // e.g. "500g", "1kg"
    price:    { type: Number, min: 0 },       // sale price
    original: { type: Number, min: 0 },       // MRP
  },
  { _id: false }
);

const nutritionSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0 },   // kcal per 100g
    protein:  { type: Number, default: 0 },   // grams
    carbs:    { type: Number, default: 0 },   // grams
    fat:      { type: Number, default: 0 },   // grams
    fiber:    { type: Number, default: 0 },   // grams
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // ── Basic Info ──────────────────────────────────────────────────────────
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Reference to Category model
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Pricing ─────────────────────────────────────────────────────────────
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    originalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ── Weight ──────────────────────────────────────────────────────────────
    // Primary display weight e.g. "500g"
    weight: {
      type: String,
      trim: true,
      default: "",
    },

    // Multiple weight/price options shown as selector buttons
    weightVariants: {
      type: [weightVariantSchema],
      default: [],
    },

    // ── Media ────────────────────────────────────────────────────────────────
    // Primary image (thumbnail in lists)
    image: {
      type: String,
      trim: true,
      default: "",
    },

    // Gallery images (shown as thumbnails on detail page)
    images: {
      type: [String],
      default: [],
    },

    // ── Nutrition ────────────────────────────────────────────────────────────
    nutrition: {
      type: nutritionSchema,
      default: () => ({}),
    },

    // ── Ratings & Reviews ────────────────────────────────────────────────────
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Stock & Status ───────────────────────────────────────────────────────
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: STATUSES,
      default: "Active",
    },

    // ── Delivery ─────────────────────────────────────────────────────────────
    // References to DeliverySlot documents — populated when fetched
    allowedSlots: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeliverySlot" }],
      default: [],
    },

    deliveryTime: {
      type: String,
      trim: true,
      default: "30-40 min",
    },

    // ── Product Flags (shown as badges on detail page) ────────────────────────
    isHalal:  { type: Boolean, default: false },  // ✅ Halal badge
    isFresh:  { type: Boolean, default: true  },  // 🌿 Fresh badge
    inStock:  { type: Boolean, default: true  },

    // ── SEO / Discovery ──────────────────────────────────────────────────────
    tags: {
      type: [String],
      default: [],
    },

    // ── Home Section Flags (admin controlled) ────────────────────────────────
    isBestSeller:  { type: Boolean, default: false },
    isFlashSale:   { type: Boolean, default: false },
    isTrending:    { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false },

    // Flash Sale countdown end time — null means no active timer
    flashSaleEndsAt: { type: Date, default: null },

    // ── Visibility ───────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ── Pre-save: sync isActive ↔ status, auto-derive status from stock ───────────
productSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.isActive = this.status === "Active";
  }
  if (this.isModified("stock") && !this.isModified("status")) {
    if (this.stock === 0)     this.status = "Out of Stock";
    else if (this.stock < 10) this.status = "Low Stock";
    else                      this.status = "Active";
    this.isActive = this.status === "Active";
  }
  next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;
