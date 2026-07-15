import HomeSlider from "../models/HomeSlider.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// CREATE SLIDER
const createHomeSlider = asyncHandler(async (req, res) => {
  try {
    const { image, title, heading, subHeading, isActive } = req.body;

    // 🔹 Validation
    if (!image?.trim()) {
      return res.status(400).json(
        new apiResponse(400, null, "Image is required")
      );
    }

    // 🔹 Duplicate Check (based on image OR full content match)
    const existingSlider = await HomeSlider.findOne({
      image: image.trim(),
      title: title?.trim(),
      heading: heading?.trim(),
      subHeading: subHeading?.trim(),
    });

    if (existingSlider) {
      return res.status(409).json(
        new apiResponse(409, null, "Slider already exists")
      );
    }

    // 🔹 Create Slider
    const slider = await HomeSlider.create({
      image: image.trim(),
      title: title?.trim() || "",
      heading: heading?.trim() || "",
      subHeading: subHeading?.trim() || "",
      isActive: isActive ?? true,
    });

    return res.status(201).json(
      new apiResponse(201, slider, "Banner created successfully")
    );

  } catch (error) {
    return res.status(500).json(
      new apiResponse(500, null, error.message)
    );
  }
});


//  GET ALL SLIDERS
const getAllHomeSliders = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = "recent",
    } = req.query;

    const match = {};
    if (isActive !== undefined) match.isActive = isActive === "true";

    let pipeline = [{ $match: match }];

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: regex } },
            { heading: { $regex: regex } },
            { subHeading: { $regex: regex } },
          ],
        },
      });
    }

    if (sortBy === "recent")
      pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
    else if (sortBy === "oldest")
      pipeline.push({ $sort: { createdAt: 1, _id: 1 } });
    else pipeline.push({ $sort: { _id: -1 } });

    const totalArr = await HomeSlider.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalArr[0]?.count || 0;

    if (isPagination === "true") {
      pipeline.push(
        { $skip: (page - 1) * Number(limit) },
        { $limit: Number(limit) }
      );
    }

    const sliders = await HomeSlider.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          sliders,
          totalSliders: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Banner fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

// GET SINGLE SLIDER
const getHomeSliderById = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid Banner ID"));
    }

    const slider = await HomeSlider.findById(req.params.id);

    if (!slider) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Banner not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, slider, "Banner fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

// UPDATE SLIDER
const updateHomeSlider = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid Banner ID"));
    }

    const updatedSlider = await HomeSlider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedSlider) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Banner not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, updatedSlider, "Banner updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

//  DELETE SLIDER
const deleteHomeSlider = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid Banner ID"));
    }

    const deletedSlider = await HomeSlider.findByIdAndDelete(req.params.id);

    if (!deletedSlider) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Banner not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, deletedSlider, "Banner deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

export {
  createHomeSlider,
  getAllHomeSliders,
  getHomeSliderById,
  updateHomeSlider,
  deleteHomeSlider,
};
