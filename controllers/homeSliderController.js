import mongoose from "mongoose";
import HomeSlider from "../models/HomeSlider.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const allowedUpdateFields = [
  "title",
  "subtitle",
  "offer",
  "cta",
  "image",
  "link",
  "placement",
  "active",
  "startDate",
  "endDate",
];

const trimString = (value) => {
  return typeof value === "string" ? value.trim() : value;
};

const isValidDate = (date) => {
  return !Number.isNaN(new Date(date).getTime());
};

// CREATE BANNER
const createHomeSlider = asyncHandler(async (req, res) => {
  const {
    title,
    subtitle,
    offer,
    cta,
    image,
    link,
    placement,
    active,
    startDate,
    endDate,
  } = req.body;

  if (!image?.trim()) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Image is required"));
  }

  if (!placement?.trim()) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Placement is required"));
  }

  if (!startDate || !isValidDate(startDate)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid start date is required"));
  }

  if (!endDate || !isValidDate(endDate)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid end date is required"));
  }

  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json(
      new apiResponse(
        400,
        null,
        "End date cannot be earlier than start date"
      )
    );
  }


  const banner = await HomeSlider.create({
    title: title?.trim() || "",
    subtitle: subtitle?.trim() || "",
    offer: offer?.trim() || "",
    cta: cta?.trim() || "Shop Now",
    image: image.trim(),
    link: link?.trim() || "",
    placement: placement.trim(),
    active: active ?? true,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  return res
    .status(201)
    .json(new apiResponse(201, banner, "Banner created successfully"));
});

// GET ALL BANNERS
const getAllHomeSliders = asyncHandler(async (req, res) => {
  const {
    isPagination = "true",
    page = "1",
    limit = "10",
    search,
    active,
    placement,
    currentlyValid,
    sortBy = "recent",
  } = req.query;

  const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(
    Math.max(Number.parseInt(limit, 10) || 10, 1),
    100
  );

  const filter = {};

  if (active !== undefined) {
    filter.active = active === "true";
  }

  if (placement?.trim()) {
    filter.placement = placement.trim();
  }

  if (search?.trim()) {
    const escapedSearch = search
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(escapedSearch, "i");

    filter.$or = [
      { title: regex },
      { subtitle: regex },
      { offer: regex },
      { cta: regex },
      { placement: regex },
    ];
  }

  // Banner must be active and current date should be inside date range
  if (currentlyValid === "true") {
    const now = new Date();

    filter.active = true;
    filter.startDate = { $lte: now };
    filter.endDate = { $gte: now };
  }

  let sort = { createdAt: -1, _id: -1 };

  if (sortBy === "oldest") {
    sort = { createdAt: 1, _id: 1 };
  } else if (sortBy === "startDateAsc") {
    sort = { startDate: 1, _id: 1 };
  } else if (sortBy === "startDateDesc") {
    sort = { startDate: -1, _id: -1 };
  } else if (sortBy === "endDateAsc") {
    sort = { endDate: 1, _id: 1 };
  }

  const totalBanners = await HomeSlider.countDocuments(filter);

  let query = HomeSlider.find(filter).sort(sort);

  if (isPagination === "true") {
    query = query
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);
  }

  const banners = await query.lean();

  return res.status(200).json(
    new apiResponse(
      200,
      {
        banners,
        totalBanners,
        totalPages:
          isPagination === "true"
            ? Math.ceil(totalBanners / limitNumber)
            : 1,
        currentPage: isPagination === "true" ? pageNumber : 1,
        limit: isPagination === "true" ? limitNumber : totalBanners,
      },
      "Banners fetched successfully"
    )
  );
});

// GET CURRENTLY ACTIVE BANNERS
const getActiveHomeSliders = asyncHandler(async (req, res) => {
  const { placement } = req.query;
  const now = new Date();

  const filter = {
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  };

  if (placement?.trim()) {
    filter.placement = placement.trim();
  }

  const banners = await HomeSlider.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(
    new apiResponse(
      200,
      banners,
      "Active banners fetched successfully"
    )
  );
});

// GET SINGLE BANNER
const getHomeSliderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const banner = await HomeSlider.findOne(id).lean();

  if (!banner) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Banner not found"));
  }

  return res
    .status(200)
    .json(new apiResponse(200, banner, "Banner fetched successfully"));
});

// UPDATE BANNER
const updateHomeSlider = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingBanner = await HomeSlider.findById(id);

  if (!existingBanner) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Banner not found"));
  }

  const updateData = {};

  for (const field of allowedUpdateFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = trimString(req.body[field]);
    }
  }

  if (updateData.image === "") {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Image cannot be empty"));
  }

  if (
    updateData.startDate !== undefined &&
    !isValidDate(updateData.startDate)
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid start date"));
  }

  if (
    updateData.endDate !== undefined &&
    !isValidDate(updateData.endDate)
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid end date"));
  }

  const finalStartDate = updateData.startDate
    ? new Date(updateData.startDate)
    : existingBanner.startDate;

  const finalEndDate = updateData.endDate
    ? new Date(updateData.endDate)
    : existingBanner.endDate;

  if (finalEndDate < finalStartDate) {
    return res.status(400).json(
      new apiResponse(
        400,
        null,
        "End date cannot be earlier than start date"
      )
    );
  }

  Object.assign(existingBanner, updateData);

  const updatedBanner = await existingBanner.save();

  return res.status(200).json(
    new apiResponse(
      200,
      updatedBanner,
      "Banner updated successfully"
    )
  );
});
// CHANGE ACTIVE STATUS
const updateHomeSliderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  if (typeof active !== "boolean") {
    return res.status(400).json(
      new apiResponse(
        400,
        null,
        "Active field must be true or false"
      )
    );
  }

  const updatedBanner = await HomeSlider.findByIdAndUpdate(
    id,
    { active },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedBanner) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Banner not found"));
  }

  return res.status(200).json(
    new apiResponse(
      200,
      updatedBanner,
      "Banner status updated successfully"
    )
  );
});

// DELETE BANNER
const deleteHomeSlider = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedBanner = await HomeSlider.findByIdAndDelete(id);

  if (!deletedBanner) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Banner not found"));
  }

  return res.status(200).json(
    new apiResponse(
      200,
      deletedBanner,
      "Banner deleted successfully"
    )
  );
});

export {
  createHomeSlider,
  getAllHomeSliders,
  getActiveHomeSliders,
  getHomeSliderById,
  updateHomeSlider,
  updateHomeSliderStatus,
  deleteHomeSlider,
};