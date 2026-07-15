import { Router } from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getProfile,
  loginWithPassword,
  registerOrLogin,
  resendOtp,
  createPassword,
  resetPassword,
  updatePassword,
  updateUserById,
  updateUserRole,
  verifyOtp,
} from "../controllers/authController.js";
import {
  authorizeUserType,
  verifyJWT,
} from "../middlewares/authTypeMiddleware.js";

const routes = Router();

// auth
routes.route("/registerOrLogin").post(registerOrLogin);
routes.route("/verifyOtp").post(verifyOtp);
routes.route("/resendOtp").post(resendOtp);

routes.route("/profile").get(verifyJWT, getProfile);

routes.route("/loginWithPassword").post(loginWithPassword);
routes.route("/createPassword").post(verifyJWT, createPassword);
routes.route("/updatePassword").post(verifyJWT, updatePassword);
routes.route("/resetPassword").post(verifyJWT, resetPassword);

routes.route("/update/:id").patch(updateUserById);
routes.route("/delete/:id").delete(verifyJWT, deleteUser);

routes.route("/getAllUsers").get(getAllUsers);
routes.route("/updateRole/:userId").put(updateUserRole);

routes.route("/createUser").post(createUser);

export default routes;
