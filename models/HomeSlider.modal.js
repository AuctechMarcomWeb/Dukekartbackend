import mongoose from "mongoose";

const PLACEMENTS = [
  "Home Top",
  "Home Middle",
  "Home Bottom",
  "Category Page",
  "Checkout Page",
];

const homeSliderSchema = new mongoose.Schema(
  {
   
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subtitle: {
      type: String,
      trim: true,
      default: "",
    },

    // Offer badge text e.g. "UP TO 20% OFF"
    offer: {
      type: String,
      trim: true,
      default: "",
    },

    // Call-to-action button label e.g. "Shop Now"
    cta: {
      type: String,
      trim: true,
      default: "Shop Now",
    },

    image: {
      type: String,
      required: true,
      trim: true,
    },

    // Deep-link or relative URL e.g. "/products?cat=Chicken"
    link: {
      type: String,
      trim: true,
      default: "",
    },

    placement: {
      type: String,
      enum: PLACEMENTS,
      required: true,
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const HomeSlider = mongoose.model("HomeSlider", homeSliderSchema);
export default HomeSlider;
