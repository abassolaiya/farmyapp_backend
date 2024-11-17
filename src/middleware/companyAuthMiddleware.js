import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Company from "../models/company/company.js";
import CompanyProduct from "../models/company/companyProductModel.js";
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
      } else if (decoded.companyId) {
        userType = "company";
        req.company = await Company.findById(decoded.companyId).select(
          "-password"
        );
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

async function checkCompanyProductOwnership(req, res, next) {
  const productId = req.params.id;
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];

    // Check if the token is blacklisted
    const isTokenBlacklisted = await TokenBlacklist.findOne({ token });

    if (isTokenBlacklisted) {
      return res.status(401).json({ error: "Token is blacklisted" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const companyId = decoded.companyId;
      const adminId = decoded.adminId;
      const product = await CompanyProduct.findById(productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Allow access if the user is an admin or the owner of the product
      if (adminId || product.userId.toString() === companyId) {
        return next();
      } else {
        return res
          .status(403)
          .json({ error: "You are not authorized to access this product" });
      }
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "An error occurred while verifying the token" });
    }
  } else {
    return res.status(401).json({ error: "Not authorized, no token" });
  }
}

export { protect, checkCompanyProductOwnership };
