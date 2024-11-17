import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Store from "../models/stores/sellerModel.js";
import StoreProduct from "../models/stores/storeProductModel.js";
import TokenBlacklist from "../models/tokenBlackListModel.js";
import Admin from "../models/buyer/adminModel.js";

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

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let userType;
      if (decoded.adminId) {
        userType = "admin";
        req.admin = await Admin.findById(decoded.adminId).select("-password");
      } else if (decoded.storeId) {
        userType = "store";
        req.store = await Store.findById(decoded.storeId).select("-password");
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

async function checkStoreProductOwnership(req, res, next) {
  const productId = req.params.id;
  let token = req.cookies.jwt || req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const storeId = decoded.storeId;

      const product = await StoreProduct.findById(productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (product.userId.toString() !== storeId && !decoded.adminId) {
        return res
          .status(403)
          .json({ error: "You are not the owner of this product" });
      }

      next();
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "An error occurred while fetching the product" });
    }
  } else {
    res.status(401).json({ error: "Not authorized, no token" });
  }
}

export { protect, checkStoreProductOwnership };
