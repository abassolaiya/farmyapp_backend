import StoreCart from "../../models/stores/storeCartModel.js";
import StoreProduct from "../../models/stores/storeProductModel.js";
import Store from "../../models/stores/sellerModel.js";
import LogisticsVehicle from "../../models/logistics/logisticsVehicleModel.js";

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

function findClosestStoreLocation(userLocation, storeLocations) {
  let closestLocation = null;
  let minDistance = Infinity;

  for (const location of storeLocations) {
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

const findStoreLocationsInCart = async (cart) => {
  try {
    const storeIds = cart.items.map((item) => item.product.userId);

    const uniqueStoreIds = [...new Set(storeIds)];

    const storeLocations = [];

    for (const storeId of uniqueStoreIds) {
      const store = await Store.findById(storeId);
      if (store) {
        storeLocations.push({
          storeId: store._id,
          storeName: store.storeName,
          locations: store.storeLocations,
        });
      }
    }

    // Log the storeLocations to check if it's populated
    // console.log("storeLocations:", storeLocations);

    return storeLocations;
  } catch (error) {
    console.error("Error in findStoreLocationsInCart:", error);
    return [];
  }
};

const addToStoreCart = async (req, res) => {
  try {
    const { user, userType } = req;
    const { product, quantity, userLocation } = req.body;

    let cart = await StoreCart.findOne({ user });

    if (!cart) {
      const productDetails = await StoreProduct.findById(product);
      const storeId = productDetails.userId;

      const newCart = new StoreCart({
        user: user._id,
        userType,
        items: [{ product, quantity: parseInt(quantity), store: storeId }],
      });

      let totalAmount = productDetails.price * parseInt(quantity);
      newCart.totalAmount = totalAmount;

      const store = await Store.findById(storeId);
      const storeLocations = store.storeLocations;
      const closestLocation = findClosestStoreLocation(
        userLocation,
        storeLocations
      );
      newCart.deliveryAddress = closestLocation.address;

      await newCart.save();

      cart = await StoreCart.findById(newCart._id).populate("items.product");
    } else {
      const productDetails = await StoreProduct.findById(product);

      const existingItem = cart.items.find((item) =>
        item.product.equals(product)
      );

      if (existingItem) {
        const existingItemDetails = await StoreProduct.findById(
          existingItem.product
        );

        if (
          existingItemDetails.userId.toString() !==
          productDetails.userId.toString()
        ) {
          return res.status(400).json({
            error:
              "You cannot add products from multiple stores to the same cart.",
          });
        }

        existingItem.quantity += parseInt(quantity);
      } else {
        cart.items.push({
          product,
          quantity: parseInt(quantity),
          store: productDetails.userId,
        });
      }

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
        const productDetails = await StoreProduct.findById(item.product);
        totalAmount += productDetails.price * parseInt(item.quantity);
      }

      cart.totalAmount = totalAmount;
      await cart.save();
    }

    const storeLocationsInCart = await findStoreLocationsInCart(cart);

    res.json({
      message: "Item added to the store cart",
      cart,
      storeLocationsInCart,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding item to the store cart" });
  }
};

const removeProductFromStoreCart = async (req, res) => {
  try {
    const { user } = req;
    const { product } = req.body;
    const cart = await StoreCart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
    }

    // Find the existing item in the cart
    const existingItemIndex = cart.items.findIndex((item) =>
      item.product.equals(product)
    );

    if (existingItemIndex !== -1) {
      cart.items.splice(existingItemIndex, 1);
      // Manually calculate the totalAmount based on the updated cart items
      let totalAmount = 0;

      for (const item of cart.items) {
        totalAmount += item.product.price * item.quantity;
      }

      // Update the cart's totalAmount
      cart.totalAmount = totalAmount;

      await cart.save();
      res.json({
        message: "Product removed from the store cart",
        cart,
        totalAmount,
      });
    } else {
      res.status(404).json({ error: "Item not found in the store cart" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error removing product from the store cart" });
  }
};

const editStoreCart = async (req, res) => {
  try {
    const { user } = req;
    const { product, quantity } = req.body;
    const cart = await StoreCart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
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
        const productDetails = await StoreProduct.findById(item.product);
        totalAmount += productDetails.price * parseInt(item.quantity);
      }

      cart.totalAmount = totalAmount;
      await cart.save();
      res.json({ message: "Store cart item edited", cart, totalAmount });
    } else {
      res.status(404).json({ error: "Item not found in the store cart" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error editing store cart item" });
  }
};

const calculateStoreTotalAmount = async (req, res) => {
  try {
    const { user } = req;
    const cart = await StoreCart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
    }

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await StoreProduct.findById(item.product);
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

    // Fetch store locations related to the cart
    const storeLocations = await findStoreLocationsInCart(cart);

    if (cart.deliveryOption === "pickup" && cart.pickupLocation) {
      cart.logistics = undefined;
      await cart.save();

      return res.json({
        cart,
        totalAmount,
        storeLocations,
      });
    }

    if (storeLocations && storeLocations.length > 0 && !cart.pickupLocation) {
      // If no pickup location set, use the first store location in the cart as pickup location
      const firstStoreLocation = storeLocations[0];

      cart.pickupLocation = firstStoreLocation._id;
      await cart.save();

      return res.json({
        cart,
        totalAmount,
        pickupLocation: firstStoreLocation,
        storeLocations,
      });
    }

    await cart.save();

    res.json({
      cart,
      totalAmount,
      storeLocations,
    });
  } catch (error) {
    console.error("Error in calculateStoreTotalAmount:", error);
    res
      .status(500)
      .json({ error: "Error calculating the total amount for the store cart" });
  }
};

const pickStoreLocation = async (req, res) => {
  try {
    const { user } = req;
    const { storeLocationId, storeId } = req.body;

    const cart = await StoreCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
    }

    const store = await Store.findById(storeId);
    const storeLocations = store.storeLocations;

    let isValidLocation = false;

    for (const location of storeLocations) {
      if (location._id.toString() === storeLocationId) {
        isValidLocation = true;
        break;
      }
    }

    if (!isValidLocation) {
      return res.status(404).json({ error: "Invalid store location ID" });
    }

    // Update the cart's pickup location
    cart.pickupLocation = storeLocationId;
    await cart.save();

    res.json({
      message: "Pickup location updated successfully",
      pickupLocation: storeLocationId,
    });
  } catch (error) {
    console.error("Error in pickStoreLocation:", error);
    res.status(500).json({ error: "Error picking store location" });
  }
};

const getStoreCartWithProductDetails = async (req, res) => {
  try {
    const { user } = req;
    const cart = await StoreCart.findOne({ user })
      .populate({
        path: "items.product",
        model: "StoreProduct",
      })
      .populate("logistics");

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
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

    const storeLocations = await findStoreLocationsInCart(cart);

    res.json({ cart, storeLocations, totalAmount });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error getting the store cart with product details" });
  }
};

const switchToPickup = async (req, res) => {
  try {
    const { user } = req;
    // console.log(user)
    const cart = await StoreCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
    }

    cart.deliveryOption = "pickup";

    if (cart.logistics) {
      cart.logistics = undefined; // Reset the logistics details
    }

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await StoreProduct.findById(item.product);
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

const editStorePrice = async (req, res) => {
  try {
    const { user, userType } = req;
    const { product, price } = req.body;
    const cart = await StoreCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
    }

    if (userType === "store") {
      const productInfo = await StoreProduct.findById(product);

      if (productInfo.userId.equals(user)) {
        const existingItem = cart.items.find((item) =>
          item.product.equals(product)
        );

        if (existingItem) {
          existingItem.price = price;
          await cart.save();
          res.json({ message: "Price edited" });
        } else {
          res.status(404).json({ error: "Item not found in the store cart" });
        }
      } else {
        res.status(403).json({ error: "Permission denied" });
      }
    } else {
      res
        .status(403)
        .json({ error: "Permission denied. Only stores can edit prices." });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error editing the price in the store cart" });
  }
};

const addLogisticsToStoreCart = async (req, res) => {
  try {
    const { user } = req;
    const { logistics, deliveryAddress } = req.body;
    const cart = await StoreCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
    }

    cart.deliveryOption = "delivery";
    cart.deliveryAddress = deliveryAddress;

    cart.logistics = logistics;

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await StoreProduct.findById(item.product);
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
    res.json({ message: "Logistics added to the store cart", cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding logistics to the store cart" });
  }
};

const addPickupLocationToStoreCart = async (req, res) => {
  try {
    const { user } = req;
    const { pickupLocation } = req.body;
    const cart = await StoreCart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
    }

    cart.deliveryOption = "pickup"; // Assuming this should be set to "pickup" for clarity
    cart.deliveryAddress = pickupLocation;

    let totalAmount = 0;

    for (const item of cart.items) {
      const productDetails = await StoreProduct.findById(item.product);
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
    res.json({ message: "Pickup location added to the store cart", cart });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error adding pickup location to the store cart" });
  }
};

export {
  addToStoreCart,
  removeProductFromStoreCart,
  editStoreCart,
  calculateStoreTotalAmount,
  getStoreCartWithProductDetails,
  editStorePrice,
  addLogisticsToStoreCart,
  addPickupLocationToStoreCart,
  pickStoreLocation,
  switchToPickup,
};
