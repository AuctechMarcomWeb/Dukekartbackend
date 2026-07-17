import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";

// ── GET /api/address ───────────────────────────────────────────────────────
export const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    return res.status(200).json(new apiResponse(200, user.addresses || [], "Addresses fetched"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── POST /api/address ──────────────────────────────────────────────────────
export const addAddress = async (req, res) => {
  try {
    const { fullName, phone, houseNo, street, landmark, area, city, state, pinCode, addressType, isDefault } = req.body;

    if (!fullName || !phone || !city || !state || !pinCode) {
      return res.status(400).json(new apiResponse(400, null, "fullName, phone, city, state, pinCode are required"));
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    // Ensure addresses array exists
    if (!user.addresses) user.addresses = [];

    // If new address is default → unset all others
    if (isDefault) {
      user.addresses.forEach(a => { a.isDefault = false; });
    }

    // First address is always default
    const shouldBeDefault = isDefault || user.addresses.length === 0;

    user.addresses.push({ fullName, phone, houseNo, street, landmark, area, city, state, pinCode, addressType: addressType || 'Home', isDefault: shouldBeDefault });
    await user.save();

    return res.status(201).json(new apiResponse(201, user.addresses, "Address added successfully"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── PATCH /api/address/:addressId ─────────────────────────────────────────
export const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    const addr = user.addresses.id(addressId);
    if (!addr) return res.status(404).json(new apiResponse(404, null, "Address not found"));

    const fields = ["fullName", "phone", "houseNo", "street", "landmark", "area", "city", "state", "pinCode", "addressType"];
    fields.forEach(f => { if (req.body[f] !== undefined) addr[f] = req.body[f]; });

    if (req.body.isDefault === true) {
      user.addresses.forEach(a => { a.isDefault = false; });
      addr.isDefault = true;
    }

    await user.save();
    return res.status(200).json(new apiResponse(200, user.addresses, "Address updated"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── DELETE /api/address/:addressId ────────────────────────────────────────
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    const addr = user.addresses.id(addressId);
    if (!addr) return res.status(404).json(new apiResponse(404, null, "Address not found"));

    const wasDefault = addr.isDefault;
    addr.deleteOne();

    // If deleted was default → make first remaining address default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return res.status(200).json(new apiResponse(200, user.addresses, "Address deleted"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};

// ── PATCH /api/address/:addressId/set-default ─────────────────────────────
export const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

    const addr = user.addresses.id(addressId);
    if (!addr) return res.status(404).json(new apiResponse(404, null, "Address not found"));

    user.addresses.forEach(a => { a.isDefault = false; });
    addr.isDefault = true;

    await user.save();
    return res.status(200).json(new apiResponse(200, user.addresses, "Default address updated"));
  } catch (err) {
    return res.status(500).json(new apiResponse(500, null, err.message));
  }
};
