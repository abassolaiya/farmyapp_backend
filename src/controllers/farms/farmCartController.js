import Cart from "../../models/farms/FarmCartModel.js";
import FarmProduct from "../../models/farms/farmProductModel.js";
import FarmerModel from "../../models/farms/farmerModel.js"; // Import your specific user type models
import StoreModel from "../../models/stores/sellerModel.js";
import LogisticsModel from "../../models/logistics/logisticsModel.js";
import UserModel from "../../models/buyer/userModel.js";

const addToCart = async (req, res) => {
  try {
    const { user, userType } = req;
    const { product, quantity } = req.body;

    let cart = await Cart.findOne({ user });

    if (!cart) {
      const productDetails = await FarmProduct.findById(product);
      const farmerId = productDetails.userId;

      const newCart = new Cart({
        user: user._id,
        userType,
        items: [{ product, quantity: parseInt(quantity), farmer: farmerId }], // Ensure quantity is a number
      });

      let totalAmount = 0;
      totalAmount = productDetails.perUnitPrice * parseInt(quantity); // Ensure quantity is a number

      newCart.totalAmount = totalAmount;

      await newCart.save();

      cart = await Cart.findById(newCart._id).populate("items.product");
    } else {
      const existingItem = cart.items.find((item) =>
        item.product.equals(product)
      );

      if (existingItem) {
        existingItem.quantity += parseInt(quantity);
      } else {
        const productDetails = await FarmProduct.findById(product);
        const farmerId = productDetails.userId;
        cart.items.push({
          product,
          quantity: parseInt(quantity),
          farmer: farmerId,
        });
      }

      let totalAmount = 0;

      for (const item of cart.items) {
        const productDetails = await FarmProduct.findById(item.product);
        totalAmount += productDetails.perUnitPrice * item.quantity;
      }

      cart.totalAmount = totalAmount;
      await cart.save();
    }

    res.json({ message: "Item added to the cart", cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding item to the cart" });
  }
};

const removeProductFromCart = async (req, res) => {
  try {
    const { user } = req;
    const { product } = req.body;
    const cart = await Cart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const existingItemIndex = cart.items.findIndex((item) =>
      item.product.equals(product)
    );

    if (existingItemIndex !== -1) {
      cart.items.splice(existingItemIndex, 1);

      let totalAmount = 0;

      for (const item of cart.items) {
        totalAmount +=
          item.negotiated === true
            ? item.negotiatedPrice * item.quantity
            : item.product.perUnitPrice * item.quantity;
      }

      cart.totalAmount = totalAmount;

      await cart.save();
      res.json({ message: "Product removed from cart", cart, totalAmount });
    } else {
      res.status(404).json({ error: "Item not found in the cart" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error removing product from the cart" });
  }
};

const editCart = async (req, res) => {
  try {
    const { user } = req;
    const { product, quantity } = req.body;
    const cart = await Cart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
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

      for (const item of cart.items) {
        totalAmount +=
          item.negotiated === true
            ? item.negotiatedPrice * item.quantity
            : item.product.perUnitPrice * item.quantity;
      }

      // Update the cart's totalAmount
      cart.totalAmount = totalAmount;

      await cart.save();
      res.json({ message: "Cart item edited", cart, totalAmount });
    } else {
      res.status(404).json({ error: "Item not found in the cart" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error editing cart item" });
  }
};

const calculateTotalAmount1 = async (req, res) => {
  try {
    const { user } = req;
    const cart = await Cart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    let totalAmount = 0;

    for (const item of cart.items) {
      totalAmount += item.negotiated
        ? item.negotiatedPrice * item.quantity
        : item.product.perUnitPrice * item.quantity;
    }

    cart.totalAmount = totalAmount;

    await cart.save();

    res.json({ cart, totalAmount });
  } catch (error) {
    res.status(500).json({ error: "Error calculating the total amount" });
  }
};

const getCartWithProductDetails = async (req, res) => {
  try {
    const { user } = req;
    const cart = await Cart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.json((message = "You've never added any product to cart"));
    }

    res.json({ cart });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error getting the cart with product details" });
  }
};

const editPrice = async (req, res) => {
  try {
    const { user, userType } = req;
    const { product, price } = req.body;
    const cart = await Cart.findOne({ user });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    if (userType === "farmer") {
      const productInfo = await FarmProduct.findById(product);

      if (productInfo.userId.equals(user)) {
        const existingItem = cart.items.find((item) =>
          item.product.equals(product)
        );

        if (existingItem) {
          existingItem.negotiatedPrice = price;
          await cart.save();
          res.json({ message: "Price edited" });
        } else {
          res.status(404).json({ error: "Item not found in the cart" });
        }
      } else {
        res.status(403).json({ error: "Permission denied" });
      }
    } else {
      res
        .status(403)
        .json({ error: "Permission denied. Only farmers can edit prices." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error editing the price" });
  }
};

const getProductsInCarts = async (req, res) => {
  try {
    const { user, userType } = req;

    const farmerProducts = await FarmProduct.find({ userId: user._id });

    const productsInCarts = [];

    for (const product of farmerProducts) {
      const carts = await Cart.find({ "items.product": product._id }).populate(
        "user"
      );

      for (const cart of carts) {
        const cartItem = cart.items.find(
          (item) => item.product.toString() === product._id.toString()
        );

        if (cartItem) {
          let userInCart;

          // Switch-case to find the user details based on userType
          switch (cart.user.userType) {
            case "Farmer":
              userInCart = await FarmerModel.findById(cart.user._id);
              break;
            case "Store":
              userInCart = await StoreModel.findById(cart.user._id);
              break;
            case "Logistics":
              userInCart = await LogisticsModel.findById(cart.user._id);
              break;
            case "User":
              userInCart = await UserModel.findById(cart.user._id);
              break;
            default:
              break;
          }

          productsInCarts.push({
            product: product,
            quantity: cartItem.quantity,
            user: userInCart,
            cartId: cart._id,
          });
        }
      }
    }

    res.json({ productsInCarts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching products in carts" });
  }
};

const editNegotiatedPrice = async (req, res) => {
  try {
    const { user, userType } = req;
    const { cartId, productId, price } = req.body;

    const cart = await Cart.findById(cartId);

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const cartItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({ error: "Product not found in the cart" });
    }

    let userModel;

    switch (userType) {
      case "Farmer":
        userModel = await FarmerModel.findById(user._id);
        break;
      case "Store":
        userModel = await StoreModel.findById(user._id);
        break;
      case "Logistics":
        userModel = await LogisticsModel.findById(user._id);
        break;
      case "User":
        userModel = await UserModel.findById(user._id);
        break;
      default:
        break;
    }

    if (userModel) {
      if (userType == "Farmer") {
        cartItem.negotiatedPrice = price;
        await cart.save();
        res.json({ message: "Negotiated price updated successfully" });
      } else {
        res.status(403).json({ error: "Permission denied" });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating negotiated price" });
  }
};

export {
  addToCart,
  removeProductFromCart,
  editCart,
  calculateTotalAmount1,
  getCartWithProductDetails,
  editPrice,
  getProductsInCarts,
  editNegotiatedPrice,
};
