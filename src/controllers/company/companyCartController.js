import CompanyCart from "../../models/company/companyCartModel.js";
import CompanyProduct from "../../models/company/companyProductModel.js";
import Company from "../../models/company/company.js";
import LogisticsVehicle from "../../models/logistics/logisticsVehicleModel.js";
import cloudinary from "../../utils/cloudinary.js";
import { createNotification } from "../notificationController.js";

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function calculateDistance(coord1, coord2) {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const earthRadiusKm = 6371;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadiusKm * c;

  return distance;
}

function findClosestCompanyLocation(userLocation, companyLocations) {
  let closestLocation = null;
  let minDistance = Infinity;

  for (const location of companyLocations) {
    const distance = calculateDistance(
      userLocation,
      location.coordinates.coordinates
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestLocation = location;
    }
  }

  return closestLocation;
}

const findCompanyLocationsInCart = async (cart) => {
  try {
    const companyIds = cart.items.map((item) => item.product.userId);

    const uniqueCompanyIds = [...new Set(companyIds)];

    const companyLocations = [];

    for (const companyId of uniqueCompanyIds) {
      const company = await Company.findById(companyId);
      if (company) {
        companyLocations.push({
          companyId: company._id,
          companyName: company.companyName,
          locations: company.companyLocations,
        });
      }
    }

    return companyLocations;
  } catch (error) {
    console.error("Error in findCompanyLocationsInCart:", error);
    return [];
  }
};

const askApproval = async (req, res) => {
  try {
    const { user } = req;
    // Find the company cart associated with the user
    const cart = await CompanyCart.findOne({ user });
    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    // Extract unique company IDs from items in the cart
    // const companyIds = [...new Set(cart.items.map((item) => item.product.company))];
    const companyId = cart.company;
    // Construct notification message
    const companyNotificationMessage =
      "Someone has added your products to their cart and is waiting for approval.";

    // Construct notification link
    const companyNotificationLink = `/cart/${cart._id}`;

    // Create notifications for each unique company ID
    // await Promise.all(companyIds.map(async (companyId) => {
    await createNotification(
      "company",
      companyId,
      companyNotificationMessage,
      companyNotificationLink,
      req.app.get("socketio")
    );
    // }));

    res.json({ message: "Your request for approval has been sent", cart });
  } catch (error) {
    console.error("Error asking for approval:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const findCompanyDetailsInCart = async (cart) => {
  try {
    const companyIds = cart.items.map((item) => item.product.userId);

    const uniqueCompanyIds = [...new Set(companyIds)];

    const companyDetails = [];

    for (const companyId of uniqueCompanyIds) {
      const company = await Company.findById(companyId);
      if (company) {
        companyDetails.push({
          companyId: company._id,
          companyName: company.companyName,
          companyAddress: company.companyAddress,
          accountName: company.accountName,
          accountNumber: company.accountNumber,
          bankName: company.bankName,
          // Add other company details as needed
        });
      }
    }

    return companyDetails;
  } catch (error) {
    console.error("Error in findCompanyDetailsInCart:", error);
    return [];
  }
};

const approveCompanyCart = async (req, res) => {
  try {
    const { user, userType } = req;
    const {cartId} =req.body;
    let cart = await CompanyCart.findOne({ company: user, _id: cartId });
    // const { cartId } = req.params; // Assuming you're passing cartId in the request params
    // const cart = await CompanyCart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    cart.isApproved = true;
    const companyNotificationMessage = "Your cart just got approved";
    const companyNotificationLink = "/myprofile/MyCart";
    const companyId = cart.user;
    await createNotification(
      "company",
      companyId,
      companyNotificationMessage,
      companyNotificationLink,
      req.app.get("socketio")
    );

    await cart.save();
    res.json({ message: "Company cart approved successfully", cart });
  } catch (error) {
    console.error("Error in approveCompanyCart:", error);
    res.status(500).json({
      error: "Error approving the company cart",
    });
  }
};

const addToCompanyCart = async (req, res) => {
  try {
    const { user, userType } = req;
    const { product, quantity, userLocation } = req.body;

    let cart = await CompanyCart.findOne({ user });

    if (!cart) {
      const productDetails = await CompanyProduct.findById(product);
      const companyId = productDetails.userId;

      const newCart = new CompanyCart({
        user: user._id,
        userType,
        items: [{ product, quantity: parseInt(quantity), company: companyId }],
        company: companyId,
      });

      let totalAmount = productDetails.price * parseInt(quantity);
      newCart.totalAmount = totalAmount;

      const company = await Company.findById(companyId);
      const companyLocations = company.companyLocations;
      const closestLocation = findClosestCompanyLocation(
        userLocation,
        companyLocations
      );
      newCart.deliveryAddress = closestLocation.address;

      await newCart.save();

      cart = await CompanyCart.findById(newCart._id).populate("items.product");
    } else {
      const productDetails = await CompanyProduct.findById(product);

      const existingItem = cart.items.find((item) =>
        item.product.equals(product)
      );

      // Check if the cart's company needs to be updated
      if (!existingItem && cart.items.length === 0) {
        cart.company = productDetails.userId;
      }
      console.log(existingItem);
      console.log(cart.company);
      console.log(productDetails.userId);

      if (existingItem) {
        const existingItemDetails = await CompanyProduct.findById(
          existingItem.product
        );

        if (cart.company !== productDetails.userId.toString()) {
          return res.status(400).json({
            error:
              "You cannot add products from multiple companies to the same cart.",
          });
        }

        existingItem.quantity += parseInt(quantity);
      } else {
        cart.items.push({
          product,
          quantity: parseInt(quantity),
          company: productDetails.userId,
        });
      }

      // Recalculate the total amount for the cart
      let totalAmount = 0;

      if (cart.logistics) {
        const logisticsVehicle = await LogisticsVehicle.findById(
          cart.logistics
        );
        if (logisticsVehicle) {
          totalAmount += logisticsVehicle.price || 0;
        }
      }

      for (const item of cart.items) {
        const productDetails = await CompanyProduct.findById(item.product);
        totalAmount += productDetails.price * parseInt(item.quantity);
      }

      cart.totalAmount = totalAmount;
      await cart.save();
    }

    // Fetch company locations related to the cart
    const companyLocationsInCart = await findCompanyLocationsInCart(cart);

    // Send response with success message and updated cart details
    res.json({
      message: "Item added to the Company cart",
      cart,
      companyLocationsInCart,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding item to the company cart" });
  }
};

const removeProductFromCompanyCart = async (req, res) => {
  try {
    const { user } = req;
    const { product } = req.body;
    const cart = await CompanyCart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    // Find the existing item in the cart
    const existingItemIndex = cart.items.findIndex((item) =>
      item.product.equals(product)
    );

    if (existingItemIndex !== -1) {
      cart.items.splice(existingItemIndex, 1);

      // Check if the cart's company needs to be updated
      if (cart.items.length === 0) {
        cart.company = null; // Empty the company field
      } else if (!cart.items.some((item) => item.company)) {
        // If no item in the cart has a company, update the cart's company to the next item's company
        cart.company = cart.items[0].company;
      }

      // Manually calculate the totalAmount based on the updated cart items
      let totalAmount = 0;

      for (const item of cart.items) {
        totalAmount += item.product.price * item.quantity;
      }

      // Update the cart's totalAmount
      cart.totalAmount = totalAmount;

      await cart.save();
      res.json({
        message: "Product removed from the company cart",
        cart,
        totalAmount,
      });
    } else {
      res.status(404).json({ error: "Item not found in the company cart" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error removing product from the company cart" });
  }
};

const editCompanyCart = async (req, res) => {
  try {
    const { user } = req;
    const { product, quantity } = req.body;
    const cart = await CompanyCart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }
    // Find the existing item in the cart
    const existingItemIndex = cart.items.findIndex((item) =>
      item.product.equals(product)
    );
    if (existingItemIndex !== -1) {
      if (quantity === 0) {
        // If quantity is zero, remove the item from the cart
        cart.items.splice(existingItemIndex, 1);
      } else {
        cart.items[existingItemIndex].quantity = quantity;
      }

      // Manually calculate the totalAmount based on the updated cart items
      let totalAmount = 0;

      if (cart.logistics) {
        const logisticsVehicle = await LogisticsVehicle.findById(
          cart.logistics
        );
        if (logisticsVehicle) {
          totalAmount += logisticsVehicle.price || 0;
        }
      }

      for (const item of cart.items) {
        const productDetails = await CompanyProduct.findById(item.product);
        totalAmount += productDetails.price * parseInt(item.quantity);
      }

      cart.totalAmount = totalAmount;

      // Handle file upload for "teller" image
      let teller = null;
      if (req.files && req.files.teller) {
        const tellerResult = await cloudinary(req.files.teller[0].path);
        teller = tellerResult.secure_url;
      }

      // Update the cart with the "teller" image URL
      cart.teller = teller;

      await cart.save();
      res.json({ message: "Company cart item edited", cart, totalAmount });
    } else {
      res.status(404).json({ error: "Item not found in the company cart" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error editing company cart item" });
  }
};

const uploadTellerImage = async (req, res) => {
  try {
    const { user } = req;
    const cart = await CompanyCart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }
    let teller = null;
    if (req.files && req.files.teller) {
      const tellerResult = await cloudinary(req.files.teller[0].path);
      teller = tellerResult.secure_url;
    }
    cart.teller = teller;
    await cart.save();
    res.json({ message: "Teller Uploaded item edited", cart, totalAmount });
  } catch (error) {
    res.status(500).json({ error: "Error uploading teller image" });
  }
};

const getCompanyCarts = async (req, res) => {
  try {
    const { user } = req;

    const carts = await CompanyCart.find({ company: user._id })
      .populate("items.product")
      .populate("logistics");
    // console.log(carts);
    // Reverse the order of the orders array
    carts.reverse();

    // console.log(orders, user._id);
    res.json({ carts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting company carts" });
  }
};

const calculateCompanyTotalAmount = async (req, res) => {
  try {
    const { user } = req;
    const cart = await CompanyCart.findOne({ user })
      .populate({
        path: "items.product",
        model: "CompanyProduct",
      })
      .populate("logistics");
    // .populate("items.product")
    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }
    const companyIds = cart.items.map((item) => item.product.userId);

    const uniqueCompanyIds = [...new Set(companyIds)];

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await CompanyProduct.findById(item.product);
      totalAmount += productDetails.price * parseInt(item.quantity);
    }

    if (cart.logistics) {
      const logisticsVehicle = await LogisticsVehicle.findById(cart.logistics);
      if (logisticsVehicle) {
        totalAmount += logisticsVehicle.price || 0;
      }
    }

    cart.totalAmount = totalAmount;
    await cart.save();

    // Fetch company locations related to the cart
    const companyLocations = await findCompanyLocationsInCart(cart);
    const accountDetails = await findCompanyDetailsInCart(cart);
    if (cart.deliveryOption === "pickup" && cart.pickupLocation) {
      cart.logistics = undefined;
      await cart.save();

      return res.json({
        cart,
        totalAmount,
        companyLocations,
        accountDetails,
      });
    }

    if (
      companyLocations &&
      companyLocations.length > 0 &&
      !cart.pickupLocation
    ) {
      const firstCompanyLocation = companyLocations[0];

      cart.pickupLocation = firstCompanyLocation._id;
      await cart.save();

      return res.json({
        cart,
        totalAmount,
        pickupLocation: firstCompanyLocation,
        companyLocations,
        accountDetails,
      });
    }
    await cart.save();

    res.json({
      cart,
      totalAmount,
      companyLocations,
    });
  } catch (error) {
    console.error("Error in calculateCompanyTotalAmount:", error);
    res.status(500).json({
      error: "Error calculating the total amount for the company cart",
    });
  }
};

const pickCompanyLocation = async (req, res) => {
  try {
    const { user } = req;
    const { companyLocationId, companyId } = req.body;

    const cart = await CompanyCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    const company = await Company.findById(companyId);
    const companyLocations = company.companyLocations;

    let isValidLocation = false;

    for (const location of companyLocations) {
      if (location._id.toString() === companyLocationId) {
        isValidLocation = true;
        break;
      }
    }

    if (!isValidLocation) {
      return res.status(404).json({ error: "Invalid company location ID" });
    }

    // Update the cart's pickup location
    cart.pickupLocation = companyLocationId;
    await cart.save();

    res.json({
      message: "Pickup location updated successfully",
      pickupLocation: companyLocationId,
    });
  } catch (error) {
    console.error("Error in pickCompanyLocation:", error);
    res.status(500).json({ error: "Error picking company location" });
  }
};

const getCompanyCartWithProductDetails = async (req, res) => {
  try {
    const { user } = req;
    const cart = await CompanyCart.findOne({ user })
      .populate({
        path: "items.product",
        model: "CompanyProduct",
        populate: {
          path: "userId",
          model: "Company",
          select: "-password -email", // Exclude sensitive fields
        },
      })
      .populate("logistics");

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    let totalAmount = 0;

    for (const item of cart.items) {
      totalAmount += item.product.price * parseInt(item.quantity);
    }

    if (cart.logistics) {
      totalAmount += cart.logistics.price || 0;
    }

    cart.totalAmount = totalAmount;
    await cart.save();
    // console.log(cart);
    const companyLocations = await findCompanyLocationsInCart(cart);

    res.json({ cart, companyLocations, totalAmount });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error getting the company cart with product details" });
  }
};

const switchToPickup = async (req, res) => {
  try {
    const { user } = req;
    const cart = await CompanyCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    cart.deliveryOption = "pickup";

    if (cart.logistics) {
      cart.logistics = undefined; // Reset the logistics details
    }

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await CompanyProduct.findById(item.product);
      totalAmount += productDetails.price * item.quantity;
    }

    cart.totalAmount = totalAmount;

    await cart.save();
    res.json({ message: "Switched to pickup", cart, totalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error switching to pickup" });
  }
};

const editCompanyPrice = async (req, res) => {
  try {
    const { user, userType } = req;
    const { product, price } = req.body;
    const cart = await CompanyCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    if (userType === "company") {
      const productInfo = await CompanyProduct.findById(product);

      if (productInfo.userId.equals(user)) {
        const existingItem = cart.items.find((item) =>
          item.product.equals(product)
        );

        if (existingItem) {
          existingItem.price = price;
          await cart.save();
          res.json({ message: "Price edited" });
        } else {
          res.status(404).json({ error: "Item not found in the comany cart" });
        }
      } else {
        res.status(403).json({ error: "Permission denied" });
      }
    } else {
      res
        .status(403)
        .json({ error: "Permission denied. Only companies can edit prices." });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error editing the price in the company cart" });
  }
};

const addLogisticsToCompanyCart = async (req, res) => {
  try {
    const { user } = req;
    const { logistics, deliveryAddress } = req.body;
    const cart = await CompanyCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    cart.deliveryOption = "delivery";
    cart.deliveryAddress = deliveryAddress;

    cart.logistics = logistics;

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await CompanyProduct.findById(item.product);
      totalAmount += productDetails.price * item.quantity;
    }

    if (logistics) {
      const logisticsVehicle = await LogisticsVehicle.findById(logistics);
      if (logisticsVehicle) {
        totalAmount += logisticsVehicle.price || 0;
      }
    }

    cart.totalAmount = totalAmount;
    await cart.save();
    res.json({ message: "Logistics added to the company cart", cart });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error adding logistics to the company cart" });
  }
};

const addPickupLocationToCompanyCart = async (req, res) => {
  try {
    const { user } = req;
    const { pickupLocation } = req.body;
    const cart = await CompanyCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    cart.deliveryOption = "pickup"; // Assuming this should be set to "pickup" for clarity
    cart.deliveryAddress = pickupLocation;

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await CompanyProduct.findById(item.product);
      totalAmount += productDetails.price * item.quantity;
    }

    if (cart.logistics) {
      const logisticsVehicle = await LogisticsVehicle.findById(cart.logistics);
      if (logisticsVehicle) {
        totalAmount += logisticsVehicle.price || 0;
      }
    }

    cart.totalAmount = totalAmount;

    await cart.save();
    res.json({ message: "Pickup location added to the company cart", cart });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error adding pickup location to the company cart" });
  }
};

const getACart = async (req, res) => {
  try {
    // const { user } = req;
    const cart = await CompanyCart.findOne({ _id: req.params.id })
      .populate({
        path: "items.product",
        model: "CompanyProduct",
      })
      .populate("logistics");
    // .populate("items.product")
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    // const companyIds = cart.items.map((item) => item.product.userId);

    // const uniqueCompanyIds = [...new Set(companyIds)];

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await CompanyProduct.findById(item.product);
      totalAmount += productDetails.price * parseInt(item.quantity);
    }

    if (cart.logistics) {
      const logisticsVehicle = await LogisticsVehicle.findById(cart.logistics);
      if (logisticsVehicle) {
        totalAmount += logisticsVehicle.price || 0;
      }
    }

    cart.totalAmount = totalAmount;
    await cart.save();

    // Fetch company locations related to the cart
    const companyLocations = await findCompanyLocationsInCart(cart);
    const accountDetails = await findCompanyDetailsInCart(cart);
    if (cart.deliveryOption === "pickup" && cart.pickupLocation) {
      cart.logistics = undefined;
      await cart.save();

      return res.json({
        cart,
        totalAmount,
        companyLocations,
      });
    }

    if (
      companyLocations &&
      companyLocations.length > 0 &&
      !cart.pickupLocation
    ) {
      const firstCompanyLocation = companyLocations[0];

      cart.pickupLocation = firstCompanyLocation._id;
      await cart.save();

      return res.json({
        cart,
        totalAmount,
        pickupLocation: firstCompanyLocation,
        companyLocations,
        accountDetails,
      });
    }
    await cart.save();

    res.json({
      cart,
      totalAmount,
      companyLocations,
    });
  } catch (error) {
    console.error("Error in calculateCompanyTotalAmount:", error);
    res.status(500).json({
      error: "Error calculating the total amount for the company cart",
    });
  }
};

export {
  addToCompanyCart,
  removeProductFromCompanyCart,
  editCompanyCart,
  calculateCompanyTotalAmount,
  getCompanyCartWithProductDetails,
  editCompanyPrice,
  addLogisticsToCompanyCart,
  addPickupLocationToCompanyCart,
  pickCompanyLocation,
  switchToPickup,
  uploadTellerImage,
  approveCompanyCart,
  getCompanyCarts,
  getACart,
  askApproval,
};
