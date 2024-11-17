import Order from "../../models/company/companyOrderModel.js";
import CompanyCart from "../../models/company/companyCartModel.js";
import Transaction from "../../models/transactionModel.js";
import Store from "../../models/stores/sellerModel.js";
import Company from "../../models/company/company.js";
import User from "../../models/buyer/userModel.js";
import Farm from "../../models/farms/farmerModel.js";
import Logistics from "../../models/logistics/logisticsModel.js";
import LogisticsVehicle from "../../models/logistics/logisticsVehicleModel.js";
import { createNotification } from "../notificationController.js";
import { cloudinary } from "../../utils/cloudinary.js";
import schedule from "node-schedule";

const createOrderFromCart = async (req, res) => {
  try {
    const { user, userType } = req;
    const paymentMethod = "bank";
    const cart = await CompanyCart.findOne({ user }).populate("items.product");
    if (!cart) {
      return res.status(404).json({ error: "Company cart not found" });
    }

    let totalCommission = 0;

    cart.items.forEach((item) => {
      const productCommission = item.product.commission * item.quantity;
      totalCommission += productCommission;
    });

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

    const companyIds = cart.items.map((item) => item.product.userId);

    // Check if payment method is bank
    if (paymentMethod === "bank") {
      userModel.wallet.totalCommission += totalCommission;
      await userModel.save();

      const newOrder = new Order({
        user: cart.user,
        userType: cart.userType,
        items: cart.items,
        totalAmount: cart.totalAmount,
        deliveryOption: cart.deliveryOption,
        company: companyIds[0],
        // logisticsVehicle: cart.logistics,
        // logistics: logisticsId,
        deliveryAddress: cart.deliveryAddress,
        pickupLocation: cart.pickupLocation,
        status: "pending",
        paymentMethod: "bank",
        teller: cart.teller,
      });

      await newOrder.save();

      const companyNotificationMessage = "You have a new order.";
      const companyNotificationLink = `/corder/${newOrder._id}`; // Change this link as needed
      const companyId = companyIds[0].toString();
      await createNotification(
        "company",
        companyId,
        companyNotificationMessage,
        companyNotificationLink,
        req.app.get("socketio")
      );

      cart.items = [];
      cart.totalAmount = 0;
      cart.logistics = null;
      cart.isApproved = false;
      await cart.save();

      return res.json({
        message: "Order created successfully",
        order: newOrder,
      });
    } else {
      return res.status(400).json({ error: "Invalid payment method" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating the order" });
  }
};

const markOrderAsPaid = async (req, res) => {
  try {
    const { user } = req;
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate("items.product");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const userIsCompanyOwner = order.items.some(
      (item) => item.product.userId.toString() === user._id.toString()
    );

    if (!userIsCompanyOwner) {
      return res.status(403).json({ error: "Permission denied" });
    }

    order.status = "Paid";
    await order.save();

    const buyerNotificationMessage =
      "Your order has been processed successfully and your payment confirmed.";
    const buyerNotificationLink = `/order/${orderId}`;
    const orderUser = order.user.toString();
    await createNotification(
      "buyer",
      orderUser,
      buyerNotificationMessage,
      buyerNotificationLink,
      req.app.get("socketio")
    );

    res.json({ message: "Order status changed to paid", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error marking order as paid" });
  }
};

const markOrderAsPacked = async (req, res) => {
  try {
    console.log(req.user);
    const { user } = req;
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate("items.product");
    console.log(order);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const userIsCompanyOwner = order.items.some(
      (item) => item.product.userId.toString() === user._id.toString()
    );

    if (!userIsCompanyOwner) {
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
      buyerNotificationLink,
      req.app.get("socketio")
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

              if (transaction.entity === "company") {
                const company = await Company.findById(transaction.entityID);
                if (company) {
                  company.wallet.finalBalance += transaction.amount;
                  company.wallet.temporaryBalance -= transaction.amount;
                  await company.save();

                  // Send notification to the company
                  const companyNotificationMessage =
                    "Order has been delivered and money moved to permanent wallet.";
                  const companyNotificationLink = `/order/${orderId}`;

                  await createNotification(
                    "company",
                    company._id.toString(),
                    companyNotificationMessage,
                    companyNotificationLink,
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
                    "Order has been delivered and money moved to permanent wallet.";
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

              // Schedule a job to send a review notification to the buyer after 24 hours
              const reviewNotificationMessage =
                "Please leave a review for the product you got yesterday.";
              const reviewNotificationLink = `/company/review/${orderId}`;

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
    const order = await Order.findById(orderId)
      .populate("items.product")
      .populate("logistics")
      .populate("company")
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

    // Reverse the order of the orders array
    orders.reverse();

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting user orders" });
  }
};

const getCompanyOrders = async (req, res) => {
  try {
    const { user } = req;

    const orders = await Order.find({ company: user._id })
      .populate("items.product")
      .populate("logistics");

    // Reverse the order of the orders array
    orders.reverse();

    // console.log(orders, user._id);
    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error getting company orders" });
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
  getCompanyOrders,
  getLogisticsOrders,
  getTotalAmountInWallet,
  markOrderAsPaid,
};
