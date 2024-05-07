import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/buyer/userModel.js";
import Farm from "../models/farms/farmerModel.js";
import Company from "../models/company/company.js";
import Store from "../models/stores/sellerModel.js";
import Logistics from "../models/logistics/logisticsModel.js";
import TokenBlacklist from "../models/tokenBlackListModel.js";

const protect = asyncHandler(async (req, res, next) => {
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
    if (decoded.userId) {
      req.user = await User.findById(decoded.userId).select("-password");
      req.userType = "user";
      next();
    } else if (decoded.storeId) {
      req.user = await Store.findById(decoded.storeId).select("-password");
      req.userType = "store";

      next();
    } else if (decoded.farmId) {
      req.user = await Farm.findById(decoded.farmId).select("-password");
      req.userType = "farmer";
      next();
    } else if (decoded.companyId) {
      req.user = await Company.findById(decoded.companyId).select("-password");
      req.userType = "company";
      next();
    } else if (decoded.logisticsId) {
      req.user = await Logistics.findById(decoded.logisticsId).select(
        "-password"
      );
      req.userType = "logistics";
      next();
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

const protect1 = asyncHandler(async (req, res, next) => {
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

    if (decoded.userId) {
      req.user = await User.findById(decoded.userId).select("-password");
      req.userType = "user";
      next();
    } else if (decoded.storeId) {
      req.user = await Store.findById(decoded.storeId).select("-password");
      req.userType = "store";

      next();
    } else if (decoded.farmId) {
      req.user = await Farm.findById(decoded.farmId).select("-password");
      req.userType = "farmer";
      next();
    } else if (decoded.logisticsId) {
      req.user = await Logistics.findById(decoded.logisticsId).select(
        "-password"
      );
      req.userType = "logistics";
      next();
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

export { protect };
