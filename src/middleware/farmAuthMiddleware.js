import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Farm from "../models/farms/farmerModel.js";
import FarmProduct from "../models/farms/farmProductModel.js";
import TokenBlacklist from "../models/tokenBlackListModel.js";
<<<<<<< HEAD
import Admin from "../models/buyer/adminModel.js";
=======
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880

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
<<<<<<< HEAD
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
=======
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

async function checkFarmProductOwnership(req, res, next) {
  const productId = req.params.id;
<<<<<<< HEAD
=======
  const farmId = req.farm._id;
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880

  try {
    const product = await FarmProduct.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

<<<<<<< HEAD
    // Allow access if the user is an admin or the owner of the product
    if (req.admin || product.userId.toString() === req.farm._id.toString()) {
      return next();
    } else {
      return res
        .status(403)
        .json({ error: "You are not authorized to access this product" });
    }
=======
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
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880
  } catch (error) {
    console.error(error);
    return res
      .status(500)
<<<<<<< HEAD
      .json({
        error: "An error occurred while verifying the product ownership",
      });
=======
      .json({ error: "An error occurred while fetching the product" });
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880
  }
}

export { farmer, checkFarmProductOwnership };
