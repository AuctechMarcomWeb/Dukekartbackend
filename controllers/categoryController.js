import Category from "../models/Category.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// CREATE CATEGORY
const createCategory = asyncHandler(async (req, res) => {
  try {
    const { name, description, image, isActive } = req.body;

    // 🔹 Validation
    if (!name?.trim()) {
      return res.status(400).json(
        new apiResponse(400, null, "Category name is required")
      );
    }

    // 🔹 Duplicate Check
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existingCategory) {
      return res.status(409).json(
        new apiResponse(409, null, "Category already exists")
      );
    }

    // 🔹 Create Category
    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || "",
      image: image?.trim() || "",
      isActive: isActive ?? true,
    });

    return res.status(201).json(
      new apiResponse(201, category, "Category created successfully")
    );
  } catch (error) {
    return res.status(500).json(
      new apiResponse(500, null, error.message)
    );
  }
});

// GET ALL CATEGORIES
const getAllCategories = asyncHandler(async (req, res) => {
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

    // 🔹 Search
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: regex } },
            { description: { $regex: regex } },
          ],
        },
      });
    }

    // 🔹 Sort
    if (sortBy === "recent")
      pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
    else if (sortBy === "oldest")
      pipeline.push({ $sort: { createdAt: 1, _id: 1 } });
    else
      pipeline.push({ $sort: { _id: -1 } });

    // 🔹 Count total
    const totalArr = await Category.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalArr[0]?.count || 0;

    // 🔹 Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) }
      );
    }

    const categories = await Category.aggregate(pipeline);

    return res.status(200).json(
      new apiResponse(
        200,
        {
          categories,
          totalCategories: total,
          totalPages: Math.ceil(total / Number(limit)),
          currentPage: Number(page),
        },
        "Categories fetched successfully"
      )
    );
  } catch (error) {
    return res.status(500).json(new apiResponse(500, null, error.message));
  }
});

// GET SINGLE CATEGORY
const getCategoryById = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json(
        new apiResponse(400, null, "Invalid Category ID")
      );
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json(
        new apiResponse(404, null, "Category not found")
      );
    }

    return res.status(200).json(
      new apiResponse(200, category, "Category fetched successfully")
    );
  } catch (error) {
    return res.status(500).json(new apiResponse(500, null, error.message));
  }
});

// UPDATE CATEGORY
const updateCategory = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json(
        new apiResponse(400, null, "Invalid Category ID")
      );
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json(
        new apiResponse(404, null, "Category not found")
      );
    }

    return res.status(200).json(
      new apiResponse(200, updatedCategory, "Category updated successfully")
    );
  } catch (error) {
    return res.status(500).json(new apiResponse(500, null, error.message));
  }
});

// DELETE CATEGORY
const deleteCategory = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json(
        new apiResponse(400, null, "Invalid Category ID")
      );
    }

    const deletedCategory = await Category.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res.status(404).json(
        new apiResponse(404, null, "Category not found")
      );
    }

    return res.status(200).json(
      new apiResponse(200, deletedCategory, "Category deleted successfully")
    );
  } catch (error) {
    return res.status(500).json(new apiResponse(500, null, error.message));
  }
});

// TOGGLE ACTIVE STATUS
const toggleCategoryStatus = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json(
        new apiResponse(400, null, "Invalid Category ID")
      );
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json(
        new apiResponse(404, null, "Category not found")
      );
    }

    category.isActive = !category.isActive;
    await category.save();

    return res.status(200).json(
      new apiResponse(200, category, `Category ${category.isActive ? "activated" : "deactivated"} successfully`)
    );
  } catch (error) {
    return res.status(500).json(new apiResponse(500, null, error.message));
  }
});

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
};
