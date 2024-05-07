import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Farm from "../models/farms/farmerModel.js";
import FarmProduct from "../models/farms/farmProductModel.js";
import TokenBlacklist from "../models/tokenBlackListModel.js";

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
      if (decoded.farmId) {
        userType = "farmer";
        req.farm = await Farm.findById(decoded.farmId).select("-password");
      } else {
        // req.userType = 'buyer'; // You can add more user types here
        // Fetch and attach the relevant user data based on the user type
        // Example: req.user = await Buyer.findById(decoded.buyerId).select('-password');
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
  const farmId = req.farm._id;

  try {
    const product = await FarmProduct.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Convert ObjectId to string if needed
    const productIdString = product.userId.toString();
    const farmIdString = farmId.toString();

    if (productIdString !== farmIdString) {
      return res
        .status(403)
        .json({ error: "You are not the owner of this product" });
    }

    // If the user owns the product, proceed to the next middleware
    next();
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching the product" });
  }
}

export { farmer, checkFarmProductOwnership };
