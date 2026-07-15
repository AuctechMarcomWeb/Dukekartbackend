import { asyncHandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
import { apiError } from "../utils/apiError.js";
import User from "../models/User.modal.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get the token from cookies or Authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

   

    if (!token) {
      apiError(res, 401, false, "Unauthorized request: No token provided");
      return;
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    
    
    // Find the user associated with the token
    const user = await User.findById(decodedToken?.userId)
    .select("-password -authToken"); // Don't return sensitive fields like password and authToken
   
    if (!user) {
      apiError(res, 401, false, "Invalid access token: User not found");
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    const jwtErrors = {
      "jwt malformed": "Invalid token format. Please log in again to get a valid access token.",
      "invalid signature": "Token signature verification failed. Access denied.",
      "jwt expired": "Your session has expired. Please log in again to continue.",
      "invalid token": "The provided token is invalid. Please authenticate again.",
      "jwt not active": "Token is not yet active. Please check your system time.",
    };
    const message = jwtErrors[error?.message] || "Authentication failed. Please provide a valid token.";
    apiError(res, 401, false, message);
    return;
  }
});

export const authorizeUserType = (...allowedTypes) => {
  return async (req, res, next) => {
   
    try {
      // Ensure the user object is attached to the request
      if (!req.user) {
        return apiError(res, 401, false, "Unauthorized access: No user data available");
      }

      // Check if the user's accountType is in the allowedTypes array
      if (!allowedTypes.includes(req.user.accountType)) {
        return apiError(res, 403, false, "Forbidden: You do not have access to this resource");
      }

      next();
    } catch (error) {
      return apiError(res, 500, false, error.message || "Error in authorization");
    }
  };
};
