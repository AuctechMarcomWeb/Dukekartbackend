import mongoose from "mongoose";
import DeliverySlot  from "../models/DeliverySlot.modal.js";
import { apiResponse }  from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── CREATE SLOT ──────────────────────────────────────────────────────────────
const createDeliverySlot = asyncHandler(async (req, res) => {
  const {
    label, time, maxOrders, deliveryCharge,
    minOrderAmount, availableDays, color, isActive,
  } = req.body;

  if (!label?.trim()) {
    return res.status(400).json(new apiResponse(400, null, "Slot label is required"));
  }
  if (!time?.trim()) {
    return res.status(400).json(new apiResponse(400, null, "Time range is required"));
  }
  if (!availableDays || availableDays.length === 0) {
    return res.status(400).json(new apiResponse(400, null, "At least one available day is required"));
  }

  // Duplicate label check
  const existing = await DeliverySlot.findOne({
    label: { $regex: new RegExp(`^${label.trim()}$`, "i") },
  });
  if (existing) {
    return res.status(409).json(new apiResponse(409, null, `Slot "${label.trim()}" already exists`));
  }

  const slot = await DeliverySlot.create({
    label:          label.trim(),
    time:           time.trim(),
    maxOrders:      Number(maxOrders      ?? 50),
    deliveryCharge: Number(deliveryCharge ?? 0),
    minOrderAmount: Number(minOrderAmount ?? 0),
    availableDays:  availableDays,
    color:          color?.trim()         || "#D4AF37",
    isActive:       isActive              ?? true,
  });

  return res.status(201).json(new apiResponse(201, slot, "Delivery slot created successfully"));
});

// ─── GET ALL SLOTS ────────────────────────────────────────────────────────────
const getAllDeliverySlots = asyncHandler(async (req, res) => {
  const { isActive, sortBy = "recent" } = req.query;

  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const sort = sortBy === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const slots = await DeliverySlot.find(filter).sort(sort).lean();

  // Summary stats for the dashboard cards
  const totalSlots      = slots.length;
  const activeSlots     = slots.filter((s) => s.isActive).length;
  const maxDailyOrders  = slots.reduce((sum, s) => sum + (s.maxOrders || 0), 0);
  const freeSlots       = slots.filter((s) => s.deliveryCharge === 0).length;

  return res.status(200).json(
    new apiResponse(200, {
      slots,
      summary: { totalSlots, activeSlots, maxDailyOrders, freeSlots },
    }, "Delivery slots fetched successfully")
  );
});

// ─── GET ACTIVE SLOTS (public — for web/app) ──────────────────────────────────
const getActiveDeliverySlots = asyncHandler(async (req, res) => {
  const slots = await DeliverySlot.find({ isActive: true })
    .sort({ createdAt: 1 })
    .lean();

  return res.status(200).json(
    new apiResponse(200, slots, "Active delivery slots fetched successfully")
  );
});

// ─── GET SINGLE SLOT ──────────────────────────────────────────────────────────
const getDeliverySlotById = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid slot ID"));
  }

  const slot = await DeliverySlot.findById(req.params.id).lean();
  if (!slot) {
    return res.status(404).json(new apiResponse(404, null, "Delivery slot not found"));
  }

  return res.status(200).json(new apiResponse(200, slot, "Delivery slot fetched successfully"));
});

// ─── UPDATE SLOT ──────────────────────────────────────────────────────────────
const updateDeliverySlot = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid slot ID"));
  }

  const slot = await DeliverySlot.findById(req.params.id);
  if (!slot) {
    return res.status(404).json(new apiResponse(404, null, "Delivery slot not found"));
  }

  // If label is changing, check for duplicate
  if (req.body.label && req.body.label.trim() !== slot.label) {
    const dup = await DeliverySlot.findOne({
      label: { $regex: new RegExp(`^${req.body.label.trim()}$`, "i") },
      _id: { $ne: slot._id },
    });
    if (dup) {
      return res.status(409).json(new apiResponse(409, null, `Slot "${req.body.label.trim()}" already exists`));
    }
  }

  const allowed = ["label","time","maxOrders","deliveryCharge","minOrderAmount","availableDays","color","isActive"];
  for (const field of allowed) {
    if (req.body[field] !== undefined) slot[field] = req.body[field];
  }

  const updated = await slot.save();
  return res.status(200).json(new apiResponse(200, updated, "Delivery slot updated successfully"));
});

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────
const toggleDeliverySlotStatus = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid slot ID"));
  }

  const slot = await DeliverySlot.findById(req.params.id);
  if (!slot) {
    return res.status(404).json(new apiResponse(404, null, "Delivery slot not found"));
  }

  slot.isActive = !slot.isActive;
  await slot.save();

  return res.status(200).json(
    new apiResponse(200, slot, `Slot ${slot.isActive ? "activated" : "deactivated"} successfully`)
  );
});

// ─── DELETE SLOT ──────────────────────────────────────────────────────────────
const deleteDeliverySlot = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid slot ID"));
  }

  const deleted = await DeliverySlot.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json(new apiResponse(404, null, "Delivery slot not found"));
  }

  return res.status(200).json(new apiResponse(200, deleted, "Delivery slot deleted successfully"));
});

export {
  createDeliverySlot,
  getAllDeliverySlots,
  getActiveDeliverySlots,
  getDeliverySlotById,
  updateDeliverySlot,
  toggleDeliverySlotStatus,
  deleteDeliverySlot,
};
