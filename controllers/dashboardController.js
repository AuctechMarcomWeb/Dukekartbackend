import HomeSlider from "../models/HomeSlider.modal.js";

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// GET /api/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    // Sirf Admin ke liye
    // if (!req.user) {
    //   return res
    //     .status(401)
    //     .json(new apiResponse(401, null, "Authentication required"));
    // }

    // if (req.user.role !== "Admin") {
    //   return res
    //     .status(403)
    //     .json(new apiResponse(403, null, "Admin access required"));
    // }

    const [
      totalSliders,
      activeSliders,
      inactiveSliders,
    ] = await Promise.all([
      HomeSlider.countDocuments(),
      HomeSlider.countDocuments({ isActive: true }),
      HomeSlider.countDocuments({ isActive: false }),
    ]);

    const dashboardData = {
      counts: {
        sliders: {
          total: totalSliders,
          active: activeSliders,
          inactive: inactiveSliders,
        },
      },
    };
    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          dashboardData,
          "Dashboard data fetched successfully"
        )
      );
  } catch (error) {
    console.error("Dashboard controller error:", error);

    return res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          error.message || "Failed to fetch dashboard data"
        )
      );
  }
});

export { getDashboardStats };