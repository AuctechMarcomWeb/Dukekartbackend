import mongoose from "mongoose";
import Product  from "../models/Product.modal.js";
import Category from "../models/Category.modal.js";
import DeliverySlot from "../models/DeliverySlot.modal.js";
import { apiResponse }  from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// ─── helpers ──────────────────────────────────────────────────────────────────
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateDeliverySlots = async (slots = []) => {
  // single id ko array me convert karega
  if (!Array.isArray(slots)) {
    slots = [slots];
  }
  // empty allowed
  if (slots.length === 0) {
    return [];
  }
  const validSlots = await DeliverySlot.find({
    _id: {
      $in: slots
    }
  });
  if (validSlots.length !== slots.length) {
    throw new Error(
      "One or more delivery slots not found"
    );
  }
  return slots;
};

// ─── CREATE PRODUCT ───────────────────────────────────────────────────────────
// ─── CREATE PRODUCT ───────────────────────────────────────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    weight,
    weightVariants,
    price,
    originalPrice,
    description,
    image,
    images,
    stock,
    rating,
    reviewCount,
    status,
    tags,
    allowedSlots,
    isHalal,
    isFresh,
    inStock,
    deliveryTime,
    nutrition,
  } = req.body;


  // Required validations
  if (!name?.trim()) {
    return res.status(400).json(
      new apiResponse(400, null, "Product name is required")
    );
  }


  if (!category) {
    return res.status(400).json(
      new apiResponse(400, null, "Category is required")
    );
  }


  if (!isValidObjectId(category)) {
    return res.status(400).json(
      new apiResponse(400, null, "Invalid category ID")
    );
  }


  if (price === undefined || price === null || price === "") {
    return res.status(400).json(
      new apiResponse(400, null, "Sale price is required")
    );
  }


  // Check category exists
  const categoryDoc = await Category.findById(category);


  if (!categoryDoc) {
    return res.status(404).json(
      new apiResponse(404, null, "Category not found")
    );
  }


  if (!categoryDoc.isActive) {
    return res.status(400).json(
      new apiResponse(400, null, "Selected category is inactive")
    );
  }



  // Duplicate Product Check
  const existingProduct = await Product.findOne({
    name: {
      $regex: `^${name.trim()}$`,
      $options: "i",
    },
    category,
  });


  if (existingProduct) {
    return res.status(409).json(
      new apiResponse(
        409,
        null,
        "Product already exists in this category"
      )
    );
  }



  // Normalize tags
  const tagsArr = Array.isArray(tags)
    ? tags.map((t) => t.trim()).filter(Boolean)
    : typeof tags === "string"
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];



  // Create Product
  const product = await Product.create({

    name: name.trim(),

    category,


    weight: weight?.trim() || "",


    weightVariants:
      Array.isArray(weightVariants)
        ? weightVariants
        : [],


    price: Number(price),


    originalPrice:
      Number(originalPrice || 0),


    description:
      description?.trim() || "",


    image:
      image?.trim() || "",


    images:
      Array.isArray(images)
        ? images
        : [],


    nutrition:
      nutrition || {},


    stock:
      Number(stock || 0),


    rating:
      Number(rating || 0),


    reviewCount:
      Number(reviewCount || 0),


    status:
      status || "Active",


    tags: tagsArr,


    // Multiple Delivery Slots Support
    allowedSlots:
      Array.isArray(allowedSlots)
        ? allowedSlots
        : [],


    isHalal:
      isHalal ?? false,


    isFresh:
      isFresh ?? true,


    inStock:
      inStock ?? true,


    deliveryTime:
      deliveryTime?.trim() || "30-40 min",

  });



  // Populate response
  await product.populate([
    {
      path: "category",
      select: "name image isActive",
    },
    {
      path: "allowedSlots",
      select:
        "label time deliveryCharge minOrderAmount availableDays color isActive",
    },
  ]);



  return res.status(201).json(
    new apiResponse(
      201,
      product,
      "Product created successfully"
    )
  );

});


// ─── GET ALL PRODUCTS (paginated, filterable, searchable) ─────────────────────
const getAllProducts = asyncHandler(async (req, res) => {
  const {
    isPagination = "true",
    page         = "1",
    limit        = "10",
    search,
    category,       // category _id
    status,
    isActive,
    sortBy       = "recent",
  } = req.query;

  const pageNum  = Math.max(Number.parseInt(page,  10) || 1, 1);
  const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 100);

  const filter = {};

  // Filter by category ObjectId
  if (category && isValidObjectId(category)) {
    filter.category = new mongoose.Types.ObjectId(category);
  }

  // Filter by status string ("Active" | "Inactive" | "Low Stock" | "Out of Stock")
  if (status && status !== "all") {
    filter.status = status;
  }

  // Filter by isActive boolean
  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  // Full-text search across name, description, tags
  if (search?.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex   = new RegExp(escaped, "i");
    filter.$or = [
      { name:        { $regex: regex } },
      { description: { $regex: regex } },
      { tags:        { $in: [regex]  } },
    ];
  }

  // Sort
  const sortMap = {
    recent:       { createdAt: -1, _id: -1 },
    oldest:       { createdAt:  1, _id:  1 },
    priceAsc:     { price:      1, _id:  1 },
    priceDesc:    { price:     -1, _id: -1 },
    ratingDesc:   { rating:    -1, _id: -1 },
    stockAsc:     { stock:      1, _id:  1 },
  };
  const sort = sortMap[sortBy] || sortMap.recent;

  const totalProducts = await Product.countDocuments(filter);

  let query = Product.find(filter)
    .populate("category",     "name image isActive")
    .populate("allowedSlots", "label time deliveryCharge minOrderAmount availableDays color isActive")
    .sort(sort);

  if (isPagination === "true") {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const products = await query.lean();

  return res.status(200).json(
    new apiResponse(200, {
      products,
      totalProducts,
      totalPages:  isPagination === "true" ? Math.ceil(totalProducts / limitNum) : 1,
      currentPage: isPagination === "true" ? pageNum : 1,
      limit:       isPagination === "true" ? limitNum : totalProducts,
    }, "Products fetched successfully")
  );
});

// ─── GET ACTIVE PRODUCTS FOR WEB (public route) ───────────────────────────────
// Returns only Active products under Active categories
const getActiveProducts = asyncHandler(async (req, res) => {
  const { category, sortBy = "recent" } = req.query;

  const filter = { isActive: true, status: "Active" };

  if (category && isValidObjectId(category)) {
    filter.category = new mongoose.Types.ObjectId(category);
  }

  const sortMap = {
    recent:     { createdAt: -1 },
    priceAsc:   { price:      1 },
    priceDesc:  { price:     -1 },
    ratingDesc: { rating:    -1 },
  };
  const sort = sortMap[sortBy] || sortMap.recent;

  // Only products whose category is also active
  const products = await Product.find(filter)
    .populate({ path: "category",     match: { isActive: true }, select: "name image" })
    .populate({ path: "allowedSlots", match: { isActive: true }, select: "label time deliveryCharge minOrderAmount availableDays color" })
    .sort(sort)
    .lean();

  // Remove products where category was inactive (populated as null)
  const filtered = products.filter((p) => p.category !== null);

  return res.status(200).json(
    new apiResponse(200, filtered, "Active products fetched successfully")
  );
});

// ─── GET SINGLE PRODUCT ───────────────────────────────────────────────────────
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid product ID"));
  }

  const product = await Product.findById(id)
    .populate("category",     "name image isActive")
    .populate("allowedSlots", "label time deliveryCharge minOrderAmount availableDays color isActive")
    .lean();

  if (!product) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  return res.status(200).json(new apiResponse(200, product, "Product fetched successfully"));
});

// ─── UPDATE PRODUCT ───────────────────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid product ID"));
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  // If category is being changed, verify new category exists and is active
  if (req.body.category) {
    if (!isValidObjectId(req.body.category)) {
      return res.status(400).json(new apiResponse(400, null, "Invalid category ID"));
    }
    const catDoc = await Category.findById(req.body.category);
    if (!catDoc) {
      return res.status(404).json(new apiResponse(404, null, "Category not found"));
    }
    if (!catDoc.isActive) {
      return res.status(400).json(new apiResponse(400, null, "Selected category is inactive"));
    }
  }

  // Normalise tags
  if (req.body.tags !== undefined) {
    req.body.tags = Array.isArray(req.body.tags)
      ? req.body.tags.map((t) => t.trim()).filter(Boolean)
      : typeof req.body.tags === "string"
        ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
  }

  const allowed = [
    "name","category","weight","weightVariants",
    "price","originalPrice","description","image","images",
    "nutrition","stock","rating","reviewCount","status",
    "tags","allowedSlots","isHalal","isFresh","inStock",
    "deliveryTime","isActive",
  ];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  }

  const updated = await product.save();
  await updated.populate("category",     "name image");
  await updated.populate("allowedSlots", "label time deliveryCharge minOrderAmount availableDays color isActive");

  return res.status(200).json(new apiResponse(200, updated, "Product updated successfully"));
});

// ─── TOGGLE ACTIVE STATUS ─────────────────────────────────────────────────────
const toggleProductStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid product ID"));
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  product.isActive = !product.isActive;
  product.status   = product.isActive ? "Active" : "Inactive";
  await product.save();

  return res.status(200).json(
    new apiResponse(200, product, `Product ${product.isActive ? "activated" : "deactivated"} successfully`)
  );
});

// ─── DELETE PRODUCT ───────────────────────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid product ID"));
  }

  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  return res.status(200).json(new apiResponse(200, deleted, "Product deleted successfully"));
});

export {
  createProduct,
  getAllProducts,
  getActiveProducts,
  getProductById,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
};
