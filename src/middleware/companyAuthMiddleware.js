import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Company from "../models/company/company.js";
import CompanyProduct from "../models/company/companyProductModel.js";
import TokenBlacklist from "../models/tokenBlackListModel.js";

const protect = asyncHandler(async (req, res, next) => {
  let token = req.headers.authorization;
  // console.log(token);
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
      // console.log(decoded);
      let userType;
      if (decoded.companyId) {
        userType = "company";
        req.company = await Company.findById(decoded.companyId).select(
          "-password"
        );
      } else {
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
  // console.log(token);
  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];

    // Check if the token is blacklisted
    const isTokenBlacklisted = await TokenBlacklist.findOne({ token });

    if (isTokenBlacklisted) {
      res.status(401);
      throw new Error("Token is blacklisted");
    }

    if (token) {
      try {
        // console.log(token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const companyId = decoded.companyId;
        const product = await CompanyProduct.findById(productId);

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        if (product.userId !== companyId) {
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
    }
  }
}

export { protect, checkCompanyProductOwnership };
