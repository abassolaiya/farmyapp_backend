import asyncHandler from 'express-async-handler';
import FarmProduct from "../../models/farms/farmProductModel.js";
import Farm from "../../models/farms/farmerModel.js";
import Cart from "../../models/farms/FarmCartModel.js";
import User from "../../models/buyer/userModel.js";

const addToCart = asyncHandler(async (req, res) => {
    const { productId, quantity, deliveryOption, logisticsVehicleId } = req.body;
    const userId = req.user._id; // Assuming user ID is available in the request
  
    // Check if the user has an existing cart, or create a new one
    let cart = await Cart.findOne({ user: userId });
  
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }
  
    // Check if the product already exists in the cart
    const existingItem = cart.items.find(item => item.product.equals(productId));
  
    if (existingItem) {
      // If the product already exists, update the quantity
      existingItem.quantity += quantity;
    } else {
      // If the product doesn't exist, create a new cart item
      cart.items.push({
        product: productId,
        quantity: quantity,
        deliveryOption: deliveryOption,
        // logisticsCompany: deliveryOption === 'delivery' ? logisticsCompanyId : undefined,
        logisticsVehicle: deliveryOption === 'delivery' ? logisticsVehicleId : undefined,
      });
    }
  
    // Calculate the total amount in the cart
    cart.totalAmount = cart.items.reduce((total, item) => total + (item.quantity * productPrice), 0); // Calculate the total based on product price
  
    // Save the updated cart
    await cart.save();
  
    res.status(200).json({ cart });
});

const removeFromCart = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user._id;
  
    // Find the user's cart
    const cart = await Cart.findOne({ user: userId });
  
    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }
  
    // Find and remove the item from the cart
    const itemIndex = cart.items.findIndex(item => item._id.equals(itemId));
  
    if (itemIndex === -1) {
      res.status(404).json({ message: 'Item not found in the cart' });
      return;
    }
  
    cart.items.splice(itemIndex, 1);
  
    // Recalculate the total amount in the cart
    cart.totalAmount = cart.items.reduce((total, item) => total + (item.quantity * productPrice), 0);
  
    // Save the updated cart
    await cart.save();
  
    res.status(200).json({ cart });
});

// Controller function to edit the user's cart
const editCart = async (req, res) => {
  const { userId } = req.user; // Get the user ID from authentication

  try {
    // Find the user's cart
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const { items } = cart;

    // Find the cart item by product ID
    const cartItem = items.find((item) => item.product.toString() === req.params.productId);

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Update cart item details based on user input
    if (req.body.deliveryOption) {
      cartItem.deliveryOption = req.body.deliveryOption;
    }

    if (req.body.logisticsVehicleId) {
      cartItem.logisticsVehicle = req.body.logisticsVehicleId;
    }

    if (req.body.deliveryAddress) {
      cartItem.deliveryAddress = req.body.deliveryAddress;
    }

    if (req.body.quantity) {
      cartItem.quantity = req.body.quantity;
    }

    // Calculate the new totalAmount for the cart
    cart.totalAmount = calculateTotalAmount(cart.items);

    // Save the updated cart
    await cart.save();

    return res.status(200).json({ message: 'Cart updated successfully', cart });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Function to calculate the total amount of items in the cart
const calculateTotalAmount = (items) => {
  return items.reduce((total, item) => {
    const itemPrice = item.product.price * item.quantity;
    return total + itemPrice;
  }, 0);
};

const getCartWithProductDetails = asyncHandler(async (req, res) => {
    const userId = req.user._id; // Replace with your actual user identification method
  
    // Find the user's cart and populate the items with product details
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        model: 'FarmProduct', // Replace with your actual product model name
      })
      .exec();
  
    if (!cart) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }
  
    res.json(cart);
});  
  

export {
    addToCart,
    removeFromCart,
    editCart,
    getCartWithProductDetails
}