<<<<<<< HEAD
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Logistics from "../models/logistics/logisticsModel.js";
import TokenBlacklist from "../models/tokenBlackListModel.js";
import Admin from "../models/buyer/adminModel.js";

const protect = asyncHandler(async (req, res, next) => {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];

=======
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import Logistics from '../models/logistics/logisticsModel.js';
import TokenBlacklist from "../models/tokenBlackListModel.js";

const protect = asyncHandler(async (req, res, next) => {
  let token = req.headers.authorization;

  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];

>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880
    // Check if the token is blacklisted
    const isTokenBlacklisted = await TokenBlacklist.findOne({ token });

    if (isTokenBlacklisted) {
      res.status(401);
      throw new Error("Token is blacklisted");
    }

    try {
<<<<<<< HEAD
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let userType;
      if (decoded.adminId) {
        userType = "admin";
        req.admin = await Admin.findById(decoded.adminId).select("-password");
      } else if (decoded.logisticsId) {
        userType = "logistics";
        req.logistics = await Logistics.findById(decoded.logisticsId).select(
          "-password"
        );
      } else {
        res.status(401);
        throw new Error("Not authorized, invalid token");
      }
=======
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
      let userType;
      if (decoded.logisticsId) {
        userType = 'logistics';
        req.logistics = await Logistics.findById(decoded.logisticsId).select('-password');
      } else {
        // Add more user types and user data fetch logic here if needed
        // Example: if (decoded.someOtherUserType) { ... }
      }
      req.userType = userType;
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880

      req.userType = userType;
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

export { protect };
