import { Router } from "express";


import { verifyJWT } from "../middlewares/authTypeMiddleware.js";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = Router();

// ✅ Public Routes
router.get("/", getDashboardStats);


export default router;
