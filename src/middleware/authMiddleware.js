import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/buyer/userModel.js";
import Farm from "../models/farms/farmerModel.js";
import Company from "../models/company/company.js";
import Store from "../models/stores/sellerModel.js";
import Logistics from "../models/logistics/logisticsModel.js";
import TokenBlacklist from "../models/tokenBlackListModel.js";
import Admin from "../models/buyer/adminModel.js";

const protectMiddleware = (adminRequired) =>
  asyncHandler(async (req, res, next) => {
    let token = req.headers.authorization;

    if (token && token.startsWith("Bearer ")) {
      token = token.split(" ")[1];

      // Check if the token is blacklisted
      const isTokenBlacklisted = await TokenBlacklist.findOne({ token });

      if (isTokenBlacklisted) {
        res.status(401);
        throw new Error("Token is blacklisted");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Assign the user based on token type
      if (decoded.adminId) {
        req.user = await Admin.findById(decoded.adminId).select("-password");
        req.userType = "admin";
      } else if (decoded.userId) {
        req.user = await User.findById(decoded.userId).select("-password");
        req.userType = "user";
      } else if (decoded.storeId) {
        req.user = await Store.findById(decoded.storeId).select("-password");
        req.userType = "store";
      } else if (decoded.farmId) {
        req.user = await Farm.findById(decoded.farmId).select("-password");
        req.userType = "farmer";
      } else if (decoded.companyId) {
        req.user = await Company.findById(decoded.companyId).select(
          "-password"
        );
        req.userType = "company";
      } else if (decoded.logisticsId) {
        req.user = await Logistics.findById(decoded.logisticsId).select(
          "-password"
        );
        req.userType = "logistics";
      } else {
        res.status(401);
        throw new Error("Not authorized, invalid token");
      }

      // If admin is required and the user is not admin, deny access
      if (adminRequired && req.userType !== "admin") {
        res.status(403);
        throw new Error("Access denied, admin only");
      }

      next();
    } else {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  });

// Wrapper function to allow `protect` to be used both with and without parentheses
const protect = (adminRequired) =>
  typeof adminRequired === "undefined"
    ? protectMiddleware(false)
    : protectMiddleware(adminRequired);

export { protect };
