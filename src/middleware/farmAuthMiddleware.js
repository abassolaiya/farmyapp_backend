import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Farm from "../models/farms/farmerModel.js";
import FarmProduct from "../models/farms/farmProductModel.js";
import TokenBlacklist from "../models/tokenBlackListModel.js";
import Admin from "../models/buyer/adminModel.js";

const farmer = asyncHandler(async (req, res, next) => {
  let token = req.headers.authorization;

  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];

    // Check if the token is blacklisted
    const isTokenBlacklisted = await TokenBlacklist.findOne({ token });

    if (isTokenBlacklisted) {
      res.status(401);
      throw new Error("Token is blacklisted");
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let userType;
      if (decoded.adminId) {
        userType = "admin";
        req.admin = await Admin.findById(decoded.adminId).select("-password");
      } else if (decoded.farmId) {
        userType = "farmer";
        req.farm = await Farm.findById(decoded.farmId).select("-password");
      } else {
        res.status(401);
        throw new Error("Not authorized, invalid token");
      }

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

async function checkFarmProductOwnership(req, res, next) {
  const productId = req.params.id;

  try {
    const product = await FarmProduct.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Allow access if the user is an admin or the owner of the product
    if (req.admin || product.userId.toString() === req.farm._id.toString()) {
      return next();
    } else {
      return res
        .status(403)
        .json({ error: "You are not authorized to access this product" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "An error occurred while verifying the product ownership",
    });
  }
}

export { farmer, checkFarmProductOwnership };
