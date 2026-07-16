import mongoose from "mongoose";
import Coupon       from "../models/Coupon.modal.js";
import { apiResponse }  from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── CREATE COUPON ────────────────────────────────────────────────────────────
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, type, value, minOrder, maxDiscount,
    usageLimit, desc, expiry, active,
  } = req.body;

  if (!code?.trim()) {
    return res.status(400).json(new apiResponse(400, null, "Coupon code is required"));
  }
  if (!type || !["flat", "percent"].includes(type)) {
    return res.status(400).json(new apiResponse(400, null, "Type must be 'flat' or 'percent'"));
  }
  if (value === undefined || value === null || value === "") {
    return res.status(400).json(new apiResponse(400, null, "Discount value is required"));
  }
  if (type === "percent" && (Number(value) < 1 || Number(value) > 100)) {
    return res.status(400).json(new apiResponse(400, null, "Percent value must be between 1 and 100"));
  }
  if (!expiry || isNaN(new Date(expiry).getTime())) {
    return res.status(400).json(new apiResponse(400, null, "Valid expiry date is required"));
  }

  // Duplicate code check
  const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (existing) {
    return res.status(409).json(new apiResponse(409, null, `Coupon "${code.toUpperCase()}" already exists`));
  }

  const coupon = await Coupon.create({
    code:         code.trim().toUpperCase(),
    type,
    value:        Number(value),
    minOrder:     Number(minOrder     || 0),
    maxDiscount:  Number(maxDiscount  || 0),
    usageLimit:   Number(usageLimit   || 1),
    usedCount:    0,
    desc:         desc?.trim()        || "",
    expiry:       new Date(expiry),
    active:       active              ?? true,
  });

  return res.status(201).json(new apiResponse(201, coupon, "Coupon created successfully"));
});

// ─── GET ALL COUPONS ──────────────────────────────────────────────────────────
const getAllCoupons = asyncHandler(async (req, res) => {
  const {
    isPagination = "true",
    page         = "1",
    limit        = "20",
    search,
    active,
    type,
    sortBy       = "recent",
  } = req.query;

  const pageNum  = Math.max(Number.parseInt(page,  10) || 1, 1);
  const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);

  const filter = {};
  if (active !== undefined)        filter.active = active === "true";
  if (type && type !== "all")      filter.type   = type;

  if (search?.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex   = new RegExp(escaped, "i");
    filter.$or = [{ code: regex }, { desc: regex }];
  }

  const sortMap = {
    recent:      { createdAt: -1 },
    oldest:      { createdAt:  1 },
    expiryAsc:   { expiry:     1 },
    expiryDesc:  { expiry:    -1 },
    usageDesc:   { usedCount: -1 },
  };
  const sort = sortMap[sortBy] || sortMap.recent;

  const totalCoupons = await Coupon.countDocuments(filter);

  let query = Coupon.find(filter).sort(sort);
  if (isPagination === "true") {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const coupons = await query.lean();

  // Summary stats for admin cards
  const allCoupons   = await Coupon.find({}).lean();
  const summary = {
    total:     allCoupons.length,
    active:    allCoupons.filter((c) => c.active).length,
    inactive:  allCoupons.filter((c) => !c.active).length,
    totalUsed: allCoupons.reduce((sum, c) => sum + (c.usedCount || 0), 0),
  };

  return res.status(200).json(
    new apiResponse(200, {
      coupons,
      totalCoupons,
      totalPages:  isPagination === "true" ? Math.ceil(totalCoupons / limitNum) : 1,
      currentPage: isPagination === "true" ? pageNum : 1,
      summary,
    }, "Coupons fetched successfully")
  );
});

// ─── GET SINGLE COUPON BY ID OR CODE ─────────────────────────────────────────
const getCouponById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const query = isValidId(id)
    ? { $or: [{ _id: id }, { code: id.toUpperCase() }] }
    : { code: id.toUpperCase() };

  const coupon = await Coupon.findOne(query).lean();
  if (!coupon) {
    return res.status(404).json(new apiResponse(404, null, "Coupon not found"));
  }

  return res.status(200).json(new apiResponse(200, coupon, "Coupon fetched successfully"));
});

// ─── VALIDATE COUPON (used during checkout) ───────────────────────────────────
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;

  if (!code?.trim()) {
    return res.status(400).json(new apiResponse(400, null, "Coupon code is required"));
  }

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) {
    return res.status(404).json(new apiResponse(404, null, "Invalid coupon code"));
  }
  if (!coupon.active) {
    return res.status(400).json(new apiResponse(400, null, "This coupon is inactive"));
  }
  if (new Date() > coupon.expiry) {
    return res.status(400).json(new apiResponse(400, null, "This coupon has expired"));
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json(new apiResponse(400, null, "This coupon usage limit has been reached"));
  }
  if (cartTotal !== undefined && Number(cartTotal) < coupon.minOrder) {
    return res.status(400).json(
      new apiResponse(400, null, `Minimum order of ₹${coupon.minOrder} required for this coupon`)
    );
  }

  // Calculate discount
  let discount = 0;
  if (coupon.type === "flat") {
    discount = coupon.value;
  } else {
    discount = Math.round((Number(cartTotal || 0) * coupon.value) / 100);
    if (coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  }

  return res.status(200).json(
    new apiResponse(200, {
      coupon,
      discount,
      finalAmount: Math.max((Number(cartTotal || 0) - discount), 0),
    }, "Coupon applied successfully")
  );
});

// ─── UPDATE COUPON ────────────────────────────────────────────────────────────
const updateCoupon = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid coupon ID"));
  }

  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return res.status(404).json(new apiResponse(404, null, "Coupon not found"));
  }

  // Duplicate code check if code is changing
  if (req.body.code && req.body.code.toUpperCase() !== coupon.code) {
    const dup = await Coupon.findOne({
      code: req.body.code.toUpperCase(),
      _id: { $ne: coupon._id },
    });
    if (dup) {
      return res.status(409).json(new apiResponse(409, null, `Coupon "${req.body.code.toUpperCase()}" already exists`));
    }
  }

  const allowed = ["code","type","value","minOrder","maxDiscount","usageLimit","desc","expiry","active"];
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      coupon[field] = field === "code"
        ? req.body.code.trim().toUpperCase()
        : field === "expiry"
          ? new Date(req.body.expiry)
          : req.body[field];
    }
  }

  const updated = await coupon.save();
  return res.status(200).json(new apiResponse(200, updated, "Coupon updated successfully"));
});

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────
const toggleCouponStatus = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid coupon ID"));
  }

  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return res.status(404).json(new apiResponse(404, null, "Coupon not found"));
  }

  coupon.active = !coupon.active;
  await coupon.save();

  return res.status(200).json(
    new apiResponse(200, coupon, `Coupon ${coupon.active ? "activated" : "deactivated"} successfully`)
  );
});

// ─── DELETE COUPON ────────────────────────────────────────────────────────────
const deleteCoupon = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid coupon ID"));
  }

  const deleted = await Coupon.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json(new apiResponse(404, null, "Coupon not found"));
  }

  return res.status(200).json(new apiResponse(200, deleted, "Coupon deleted successfully"));
});

export {
  createCoupon,
  getAllCoupons,
  getCouponById,
  validateCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
};
