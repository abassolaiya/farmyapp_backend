import Order from "../../models/stores/storeOrderModel.js";
import StoreCart from "../../models/stores/storeCartModel.js";
import Transaction from "../../models/transactionModel.js";
import Store from "../../models/stores/sellerModel.js";
import User from "../../models/buyer/userModel.js";
import Farm from "../../models/farms/farmerModel.js";
import Company from "../../models/company/company.js";
import Logistics from "../../models/logistics/logisticsModel.js";
import LogisticsVehicle from "../../models/logistics/logisticsVehicleModel.js";
import { createNotification } from "../notificationController.js";

const createOrderFromCart = async (req, res) => {
  try {
    const { user, userType } = req;
    const { paymentMethod } = req.body || card;
    const cart = await StoreCart.findOne({ user }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ error: "Store cart not found" });
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
        userModel = await Logistics.findOne(user._id);
        break;
      default:
        return res.status(400).json({ error: "Invalid user type" });
    }
    // console.log(userModel)
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

    let storeCredit = cart.totalAmount;
    let logisticsCredit = 0;
    let logisticsId;

    if (cart.logistics) {
      const logisticsVehicle = await LogisticsVehicle.findOne({
        _id: cart.logistics,
      });
      if (!logisticsVehicle) {
        return res.status(404).json({ error: "Logistics vehicle not found" });
      }
      logisticsCredit = logisticsVehicle.price;
      storeCredit -= logisticsVehicle.price
      logisticsId = logisticsVehicle.userId;
      let logisticsCompany = await Logistics.findOne({
        _id: logisticsVehicle.userId,
      });
      if (!logisticsCompany) {
        return res.status(404).json({ error: "Logistics company not found" });
      }
      logisticsCompany.wallet.temporaryBalance += logisticsCredit * 0.97;
      await logisticsCompany.save();
    }
    // console.log(storeCredit)
    storeCredit *= 0.97;

    const storeIds = cart.items.map((item) => item.product.userId);

    const store = await Store.findOne({ _id: storeIds[0] });

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    store.wallet.temporaryBalance += storeCredit;
    await store.save();

    const newOrder = new Order({
      user: cart.user,
      userType: cart.userType,
      items: cart.items,
      totalAmount: cart.totalAmount,
      deliveryOption: cart.deliveryOption,
      logisticsVehicle: cart.logistics,
      logistics: logisticsId,
      store: storeIds[0],
      deliveryAddress: cart.deliveryAddress,
      pickupLocation: cart.pickupLocation,
      status: "Paid",
      paymentMethod: paymentMethod,
    });

    await newOrder.save();

    const storeNotificationMessage = "You have a new order.";
    const storeNotificationLink = `/order/${newOrder._id}`; // Change this link as needed
    const storeId = storeIds[0].toString();
    await createNotification(
      "store",
      storeId,
      storeNotificationMessage,
      storeNotificationLink,
      req.app.get("socketio")
    );

    // Send notification to the logistics company if applicable
    if (cart.logistics) {
      const logisticsNotificationMessage = "You have a new order for delivery.";
      const logisticsNotificationLink = `/order/${newOrder._id}`; // Change this link as needed
      const logistic = logisticsId.toString();
      await createNotification(
        "logistics",
        logistic,
        logisticsNotificationMessage,
        logisticsNotificationLink,
        req.app.get("socketio")
      );
    }

    const storeTransaction = new Transaction({
      user: cart.user,
      userType: cart.userType,
      amount: storeCredit / 0.97,
      type: "credit",
      entity: "store",
      entityID: user._id,
      status: "temporary",
      orderID: newOrder._id, // Assigning order ID to store transaction
    });

    if (cart.logistics) {
      const logisticsTransactionData = {
        user: cart.user,
        userType: cart.userType,
        amount: logisticsCredit * 0.97,
        type: "credit",
        entity: "logistics",
        entityID: logisticsId,
        status: "temporary",
        orderID: newOrder._id,
      };

      let logisticsTransaction = new Transaction(logisticsTransactionData);
      await logisticsTransaction.save();
    }

    await storeTransaction.save();

    cart.items = [];
    cart.totalAmount = 0;
    cart.logistics = null;
    await cart.save();

    res.json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating the order" });
  }
};

const markOrderAsPacked = async (req, res) => {
  try {
    const { user } = req;
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate("items.product");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const userIsStoreOwner = order.items.some(
      (item) => item.product.userId.toString() === user._id.toString()
    );

    if (!userIsStoreOwner) {
      return res.status(403).json({ error: "Permission denied" });
    }

    order.status = "Packed";
    await order.save();

    const buyerNotificationMessage =
      "Your order has been packed and is ready for delivery.";
    const buyerNotificationLink = `/order/${orderId}`;
    const orderUser = order.user.toString();

    await createNotification(
      "buyer",
      orderUser,
      buyerNotificationMessage,
      buyerNotificationLink
    );

    if (order.logistics) {
      const logisticsNotificationMessage =
        "You have an order ready for delivery.";
      const logisticsNotificationLink = `/order/${orderId}`;
      const logistic = order.logistics.toString();
      await createNotification(
        "logistics",
        logistic,
        logisticsNotificationMessage,
        logisticsNotificationLink,
        req.app.get("socketio")
      );
    }

    res.json({ message: "Order status changed to packed", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error marking order as packed" });
  }
};

const markOrderAsInTransit = async (req, res) => {
  try {
    const { user } = req;
    console.log(user)
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate("logistics");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (
      order.logistics &&
      order.logistics.userId.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ error: "Permission denied" });
    }

    order.status = "In transit";
    await order.save();

    const buyerNotificationMessage =
      "Your order is in transit to be delivered to you..";
    const buyerNotificationLink = `/order/${orderId}`;
    const orderUser = order.user.toString();

    await createNotification(
      "buyer",
      orderUser,
      buyerNotificationMessage,
      buyerNotificationLink,
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
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.user.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (status === "Delivered" || status === "Canceled") {
      order.status = status;
      await order.save();

      const transactions = await Transaction.find({ orderID: orderId });

      await Promise.all(
        transactions.map(async (transaction) => {
          if (transaction.status === "temporary") {
            if (status === "Delivered") {
              transaction.status = "final";
              await transaction.save();

              if (transaction.entity === "store") {
                const store = await Store.findById(transaction.entityID);
                if (store) {
                  store.wallet.finalBalance += transaction.amount;
                  store.wallet.temporaryBalance -= transaction.amount;
                  await store.save();

                  // Send notification to the store
                  const storeNotificationMessage =
                    "Order has been delivered and money moved to permanent wallet.";
                  const storeNotificationLink = `/order/${orderId}`;

                  await createNotification(
                    "store",
                    store._id.toString(),
                    storeNotificationMessage,
                    storeNotificationLink,
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

                  const logisticsNotificationMessage =
                    "Order has been delivered and money moved to permanent wallet..";
                  const logisticsNotificationLink = `/orders/${orderId}`; // Change this link as needed

                  await createNotification(
                    "logistics",
                    logistics._id.toString(),
                    logisticsNotificationMessage,
                    logisticsNotificationLink,
                    req.app.get("socketio")
                  );
                }
              }
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
    const order = await Order.findById(orderId)
      .populate("items.product")
      .populate("logistics")
      .populate("store")
      .populate("logisticsVehicle");

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
    const orders = await Order.find({ user })
      .populate("items.product")
      .populate("logistics");

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting user orders" });
  }
};

const getStoreOrders = async (req, res) => {
  try {
    const { user } = req;
    const orders = await Order.find({ store: user._id })
      .populate("items.product")
      .populate("logistics");

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting store orders" });
  }
};

const getLogisticsOrders = async (req, res) => {
  try {
    const { user } = req;
    const orders = await Order.find({ logistics: user._id })
      .populate("items.product")
      .populate("logistics");

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting logistics orders" });
  }
};

const getTotalAmountInWallet = async (req, res) => {
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
};

export {
  createOrderFromCart,
  markOrderAsPacked,
  markOrderAsInTransit,
  updateOrderStatus,
  getOrderDetails,
  getUserOrders,
  getStoreOrders,
  getLogisticsOrders,
  getTotalAmountInWallet,
};
