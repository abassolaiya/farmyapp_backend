import FarmOrder from "../../models/farms/farmOrderModel.js";
import Cart from "../../models/farms/FarmCartModel.js";
import Farm from "../../models/farms/farmerModel.js";
import Transaction from "../../models/transactionModel.js";
import Store from "../../models/stores/sellerModel.js";
import User from "../../models/buyer/userModel.js";
import Company from "../../models/company/company.js";
import Logistics from "../../models/logistics/logisticsModel.js";
import FarmProduct from "../../models/farms/farmProductModel.js";
import asyncHandler from "express-async-handler";
import { createNotification } from "../notificationController.js";
import schedule from "node-schedule";

const createOrderFromCart = async (req, res) => {
  try {
    const { user, userType } = req;
    const { paymentMethod } = req.body || card;
    const cart = await Cart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Farm cart not found" });
    }
    let totalFinalWallet;
    let userModel;

    switch (userType) {
      case "user":
        userModel = await User.findById(user._id);
        break;
      case "store":
        userModel = await Store.findById(user._id);
        break;
      case "company":
        userModel = await Company.findById(user._id);
        break;
      case "farmer":
        userModel = await Farm.findById(user._id);
        break;
      case "logistics":
        userModel = await Logistics.findById(user._id);
        break;
      default:
        return res.status(400).json({ error: "Invalid user type" });
    }

    totalFinalWallet = userModel.wallet.finalBalance;

    if (paymentMethod === "wallet") {
      if (cart.totalAmount > totalFinalWallet) {
        return res
          .status(400)
          .json({ error: "Insufficient funds in your wallet" });
      }

      totalFinalWallet -= cart.totalAmount;
      userModel.wallet.finalBalance = totalFinalWallet;
      await userModel.save();
    }

    for (const item of cart.items) {
      const product = item.product;
      const paymentAmount = product.perUnitPrice * item.quantity;

      // Update the product's available quantity
      const updatedQuantity = product.availableQuantity - item.quantity;
      if (updatedQuantity < 0) {
        return res
          .status(400)
          .json({ error: "Not enough stock for the product" });
      }

      product.availableQuantity = updatedQuantity;
      await product.save();

      const farm = await Farm.findById(product.userId);
      if (!farm) {
        return res.status(404).json({ error: "Farm not found" });
      }
      const farmCredit = paymentAmount * 0.97; // Calculate store credit
      farm.wallet.temporaryBalance += farmCredit;
      await farm.save();

      const newOrder = new FarmOrder({
        user: cart.user,
        userType: cart.userType,
        items: [item],
        totalAmount: paymentAmount,
        deliveryOption: cart.deliveryOption,
        logisticsVehicle: cart.logistics,
        store: product.userId,
        deliveryAddress: cart.deliveryAddress,
        pickupLocation: cart.pickupLocation,
        status: "Paid",
        paymentMethod: paymentMethod,
      });

      await newOrder.save();
      const notificationMessage = "One of your Farm produce just got ordered";
      const notificationLink = `/farmorder/${newOrder._id}`;
      await createNotification(
        "farmer",
        farm._id.toString(),
        notificationMessage,
        notificationLink,
        req.app.get("socketio")
      );

      const storeTransaction = new Transaction({
        user: cart.user,
        userType: cart.userType,
        amount: farmCredit,
        type: "credit",
        entity: "farm",
        entityID: farm._id,
        status: "temporary",
        orderID: newOrder._id,
      });
      await storeTransaction.save();
    }

    // const logistics = await Logistics.findOne({user})
    // if (!logistics) {
    //   return res.status(404).json({ error: 'Store not found' });
    // }

    // logistics.wallet.temporaryBalance += logisticsCredit;

    // await logistics.save();

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();
    res.json({ message: "Order created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating the order" });
  }
};

const markOrderAsPacked = async (req, res) => {
  try {
    const { user } = req;
    const orderId = req.params.id;
    const order = await FarmOrder.findById(orderId).populate("items.product");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const userIsFarmOwner = order.items.some(
      (item) => item.product.userId.toString() === user._id.toString()
    );

    if (!userIsFarmOwner) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const packedNotificationMessage = "Your farm order has been packed.";
    await createNotification(
      "user",
      user._id.toString(),
      packedNotificationMessage,
      "/farmorder/" + order._id,
      req.app.get("socketio")
    );

    order.status = "packed";
    await order.save();

    res.json({ message: "Order status changed to packed", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error marking order as packed" });
  }
};

const markOrderAsInTransit = async (req, res) => {
  try {
    const { user } = req;
    const orderId = req.params.id;
    const order = await FarmOrder.findById(orderId).populate("logistics");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (
      order.logistics &&
      order.logistics.userId.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ error: "Permission denied" });
    }

    order.status = "in transit";
    await order.save();
    const transitNotificationMessage = "Your farm order is now in transit.";
    await createNotification(
      "logistics",
      order.user.toString(),
      transitNotificationMessage,
      "/farmorder/" + order._id,
      req.app.get("socketio")
    );

    res.json({ message: "Order status changed to in transit", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error marking order as in transit" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { user } = req;
    const { status } = req.body;
    const orderId = req.params.id;
    const order = await FarmOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.user.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (status === "Delivered" || status === "canceled") {
      order.status = status;
      await order.save();

      const transactions = await Transaction.find({ orderID: orderId });

      await Promise.all(
        transactions.map(async (transaction) => {
          if (transaction.status === "temporary") {
            if (status === "Delivered") {
              transaction.status = "final";
              await transaction.save();

              if (transaction.entity === "farm") {
                const farm = await Farm.findById(transaction.entityID);
                if (farm) {
                  farm.wallet.finalBalance += transaction.amount;
                  farm.wallet.temporaryBalance -= transaction.amount;
                  await farm.save();
                  const deliveredOrCanceledNotificationMessage = `The order status has changed to ${status}.`;
                  await createNotification(
                    "farmer",
                    farm._id.toString(),
                    deliveredOrCanceledNotificationMessage,
                    "/farmorder/" + order._id,
                    req.app.get("socketio")
                  );
                }
              }

              if (transaction.entity === "logistics") {
                const logistics = await Logistics.findById(
                  transaction.entityID
                );
                if (logistics) {
                  logistics.wallet.finalBalance += transaction.amount;
                  logistics.wallet.temporaryBalance -= transaction.amount;
                  await logistics.save();
                }
              }

              // Schedule a job to send a review notification to the buyer after 24 hours
              const reviewNotificationMessage =
                "Please leave a review for the product you purchased yesterday.";
              const reviewNotificationLink = `/farm/review/${order._id}`; // Change this link as needed

              schedule.scheduleJob(
                new Date(Date.now() + 24 * 60 * 60 * 1000),
                async () => {
                  await createNotification(
                    "user",
                    user._id.toString(),
                    reviewNotificationMessage,
                    reviewNotificationLink,
                    req.app.get("socketio")
                  );
                }
              );
            } else if (status === "canceled") {
              transaction.status = "canceled";
              transaction.amount = 0;
              await transaction.save();
            }
          }
        })
      );

      res.json({ message: `Order status changed to ${status}`, order });
    } else {
      res.status(400).json({ error: "Invalid status" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating order status" });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await FarmOrder.findById(orderId).populate("items.product");
    // .populate("logistics");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting order details" });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const { user } = req;
    const orders = await FarmOrder.find({ user: user._id }).populate(
      "items.product"
    );
    // .populate("logistics");

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting farm orders" });
  }
};

const getFarmOrders = asyncHandler(async (req, res) => {
  try {
    const { user } = req;
    const orders = await FarmOrder.find({ farm: user._id }).populate(
      "items.product"
    );
    // .populate("logistics");

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting farm orders" });
  }
});

const getFarmLogisticsOrders = asyncHandler(async (req, res) => {
  try {
    const { user } = req;
    const orders = await FarmOrder.find({ "logistics.userId": user._id })
      .populate("items.product")
      .populate("logistics");

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting logistics orders" });
  }
});

const getTotalAmountInWallet = asyncHandler(async (req, res) => {
  try {
    const { entity } = req.params;
    const totalTemporaryWallet = await Transaction.getTotalTemporaryWallet(
      entity
    );
    const totalFinalWallet = await Transaction.getTotalFinalWallet(entity);

    res.json({ totalTemporaryWallet, totalFinalWallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting total amount in wallet" });
  }
});

export {
  createOrderFromCart,
  markOrderAsPacked,
  markOrderAsInTransit,
  updateOrderStatus,
  getOrderDetails,
  getUserOrders,
  getFarmOrders,
  getFarmLogisticsOrders,
  getTotalAmountInWallet,
};
