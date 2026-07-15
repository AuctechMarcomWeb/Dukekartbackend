import mongoose from "mongoose";

const homeSliderSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      trim: true,
    },

    heading: {
      type: String,
      trim: true,
    },

    subHeading: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const HomeSlider = mongoose.model("HomeSlider", homeSliderSchema);
export default HomeSlider;
