import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllRead,
  sendNotification,
  deleteNotification,
} from "../controllers/notificationController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/",                      getNotifications);
router.patch("/read-all",            markAllRead);
router.patch("/:id/read",            markAsRead);
router.post("/send",                 sendNotification); // Admin only
router.delete("/:id",                deleteNotification); // Admin only

export default router;
