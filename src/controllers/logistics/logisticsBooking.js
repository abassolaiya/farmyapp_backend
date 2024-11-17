import Booking from "../../models/logistics/LogisticsBooking.js";
import Logistics from "../../models/logistics/logisticsModel.js";
import LogisticsVehicle from "../../models/logistics/logisticsVehicleModel.js";
import Store from "../../models/stores/sellerModel.js";
import User from "../../models/buyer/userModel.js";
import Farm from "../../models/farms/farmerModel.js";
import Company from "../../models/company/company.js";
import Transaction from "../../models/transactionModel.js";
import { createNotification } from "../notificationController.js";
import schedule from "node-schedule";
const addVehicleToCart = async (req, res) => {
  try {
    const { user, userType } = req;
    const { paymentMethod } = req.body || "card";
    const {
      logisticsCompanySlug,
      logisticsVehicleId,
      pickupLocation,
      deliveryLocation,
      deliveryType,
      phoneNumber,
      name,
    } = req.body;
    const logisticsCompany = await Logistics.findOne({
      slug: logisticsCompanySlug,
    });

    if (!logisticsCompany) {
      return res.status(404).json({ error: "Logistics company not found." });
    }

    const logisticsVehicle = await LogisticsVehicle.findById(
      logisticsVehicleId
    );

    if (!logisticsVehicle) {
      return res.status(404).json({ error: "Logistics vehicle not found." });
    }
    const booking = new Booking({
      user: user._id,
      userType: userType,
      logistics: logisticsVehicle._id,
      logisticsCompany: logisticsCompany._id,
      pickupLocation: pickupLocation,
      deliveryLocation: deliveryLocation,
      deliveryType: deliveryType,
      name: name,
      phoneNumber: phoneNumber,
      totalPrice: logisticsVehicle.price,
    });

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

        if (!userModel) {
          return res.status(404).json({ error: "Farmer not found." });
        }
        break;
      case "logistics":
        userModel = await LogisticsVehicle.findOne({ userId: user._id });
        break;
      default:
        return res.status(400).json({ error: "Invalid user type" });
    }

    totalFinalWallet = userModel.wallet.finalBalance;

    if (paymentMethod === "wallet") {
      if (logisticsVehicle.price > totalFinalWallet) {
        return res
          .status(400)
          .json({ error: "Insufficient funds in your wallet" });
      }

      totalFinalWallet -= logisticsVehicle.price;
      userModel.wallet.finalBalance = totalFinalWallet;
      await userModel.save();
    }

    // Deduct payment from wallet and create a transaction
    const logisticsCompanyPayment = logisticsVehicle.price * 0.97; // 97% of the logistics vehicle price

    // Update temporary balance of logistics company
    logisticsCompany.wallet.temporaryBalance += logisticsCompanyPayment;
    await logisticsCompany.save();
    // Create a transaction for the logistics company
    const logisticsTransactionData = {
      user: user._id,
      userType: userType,
      amount: logisticsCompanyPayment,
      type: "credit",
      entity: "logistics",
      entityID: logisticsCompany._id,
      status: "temporary",
      orderId: booking._id, // Assigning booking ID to logistics transaction
    };

    const logisticsTransaction = new Transaction(logisticsTransactionData);
    await logisticsTransaction.save();

    // Change the status of the booking to "Paid"
    booking.status = "paid";
    const savedBooking = await booking.save();

    const logisticsNotificationMessage =
      "Your logistics service just got hired.";
    const logisticsNotificationLink = `/logisticsorder/${booking._id}`; // Change this link as needed
    const logisticsId = logisticsCompany._id.toString();
    await createNotification(
      "logistics",
      logisticsId,
      logisticsNotificationMessage,
      logisticsNotificationLink,
      req.app.get("socketio")
    );

    res.json({
      message: "Logistics booking successful",
      booking: savedBooking,
    });
  } catch (error) {
    console.log(res.json);
    res
      .status(500)
      .json({ error: error.message || "Error creating logistics booking" });
  }
};

const editCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.userType;

    const { cartItemId } = req.params;
    const updatedData = req.body;

    const booking = await Booking.findOne({ _id: cartItemId, user: userId });

    if (!booking) {
      return res.status(404).json({
        error: "Cart item not found or you do not have permission to edit it.",
      });
    }

    // Update the cart item fields as needed
    for (const key in updatedData) {
      if (Object.hasOwnProperty.call(updatedData, key)) {
        booking[key] = updatedData[key];
      }
    }

    const updatedCartItem = await booking.save();
    res.status(200).json(updatedCartItem);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while editing the cart item." });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user._id;

    const booking = await Booking.findOne({ _id: bookingId, user: userId });

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found or you do not have permission to cancel it.",
      });
    }

    booking.status = "cancelled";
    await booking.save();
    res.status(200).json(booking);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while cancelling the booking." });
  }
};

const getAllBookingsByUser = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you have the user's ID in the request object
    const bookings = await Booking.find({ user: userId });
    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching bookings." });
  }
};

const getBookingsByLogisticsCompany = async (req, res) => {
  try {
    const logisticsCompanyId = req.user._id;
    const bookings = await Booking.find({
      logisticsCompany: logisticsCompanyId,
    });
    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching bookings." });
  }
};

const changeOrderStatus = async (req, res) => {
  try {
    const logisticsCompanyId = req.user._id;

    const { orderId, newStatus } = req.body;

    const order = await Booking.findOne({
      _id: orderId,
      logisticsCompany: logisticsCompanyId,
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found or you do not have permission to update it.",
      });
    }

    order.status = newStatus;

    const updatedOrder = await order.save();
    res.status(200).json(updatedOrder);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while changing the order status." });
  }
};

const updateBookingStatusByLogistics = async (req, res) => {
  try {
    const { user, userType } = req;
    const orderId = req.params.orderId;

    if (userType !== "logistics") {
      return res.status(404).json({ error: "Logistics company not found" });
    }

    const order = await Booking.findById(orderId).populate("logistics");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (
      !order.logistics ||
      order.logisticsCompany.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ error: "Permission denied" });
    }

    order.status = "collected"; // Update the order status to 'Collected' for logistics
    await order.save();

    const userNotificationMessage =
      "Your order has been collected and is in transit.";
    const userNotificationLink = `/logisticsorder/${orderId}`;

    await createNotification(
      "buyer",
      order.user.toString(),
      userNotificationMessage,
      userNotificationLink,
      req.app.get("socketio")
    );

    res.json({ message: "Order status changed to collected", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error marking order as collected" });
  }
};

const updateBookingStatusByUser = async (req, res) => {
  try {
    const { user } = req;
    const { status } = req.body;
    const orderId = req.params.id;
    const order = await Booking.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.user.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (status === "delivered" || status === "cancelled") {
      order.status = status;
      await order.save();

      const transactions = await Transaction.find({ orderID: orderId });

      await Promise.all(
        transactions.map(async (transaction) => {
          if (transaction.status === "temporary") {
            if (status === "delivered") {
              transaction.status = "final";
              await transaction.save();

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
                  const logisticsNotificationLink = `/logisticsorders/${orderId}`;

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
                "Please leave a review for the delivery you got yesterday.";
              const reviewNotificationLink = `/logistics/review/${order._id}`;

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

const getBookingDetail = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Calculate the final amount considering the negotiated price if available
    let finalAmount = booking.totalPrice;

    if (booking.negotiatedPrice) {
      finalAmount = booking.negotiatedPrice;
    }

    res.json({ booking, finalAmount });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving booking details" });
  }
};

export {
  changeOrderStatus,
  getBookingsByLogisticsCompany,
  getAllBookingsByUser,
  cancelBooking,
  editCartItem,
  addVehicleToCart,
  updateBookingStatusByUser,
  updateBookingStatusByLogistics,
  getBookingDetail,
};
