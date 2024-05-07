import Notification from "../models/notificationModel.js";

import FarmerModel from "../models/farms/farmerModel.js"; // Import your specific user type models
import StoreModel from "../models/stores/sellerModel.js";
import LogisticsModel from "../models/logistics/logisticsModel.js";
import CompanyModel from "../models/company/company.js";
import UserModel from "../models/buyer/userModel.js";
import { sendPushNotification } from "../utils/expo.js";
import ExpoPushToken from "../models/expoPushTokenModel.js";

const createNotification1 = async (req, res) => {
  try {
    const { userType } = req;
    const { user, message, link } = req.body;

    const userTypeString = userType;

    let userModel;

    switch (userTypeString) {
      case "farmer":
        userModel = await FarmerModel.findById(user);
        break;
      case "store":
        userModel = await StoreModel.findById(user);
        break;
      case "logistics":
        userModel = await LogisticsModel.findById(user);
        break;
      case "company":
        userModel = await CompanyModel.findById(user);
        break;
      case "user":
        userModel = await UserModel.findById(user);
        break;
      default:
        break;
    }

    if (!userModel) {
      return res.status(404).json({ error: "User not found" });
    }

    const notification = new Notification({
      message,
      user,
      userType: userTypeString,
      link,
    });
    await notification.save();
    const io = req.app.get("socketio");

    io.emit(`notification_${user._id}`, notification);
    const notificationWithUserDetails = { notification, user: userModel };

    //now check for and retrieve expoPushToken
    // const clientOrder = link;
    // const expoPushToken = clientOrder.expoPushToken;
    const clientOrderStatus = clientOrder.orderStatus;
    //now send push notification to client if pushtoken is retrieved . the pushtoken will be sent as part part of the request body from the frontend .
    // expoPushToken &&
    //   sendPushNotification([expoPushToken], message, clientOrderStatus, link);

    // Retrieve expoPushTokens for the user
    const expoPushTokenEntry = await ExpoPushToken.findOne({
      user: userModel._id,
    });

    if (expoPushTokenEntry) {
      // Send push notification to each expoPushToken
      console.log(expoPushTokenEntry, "sending push notification");
      sendPushNotification([expoPushTokenEntry], message, message, link);
    }

    const expoPushTokens = expoPushTokenEntry.expoPushTokens || [];

    res.status(201).json({ notificationWithUserDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating notification" });
  }
};

const createNotification = async (userType, user, message, link, io) => {
  try {
    const notification = new Notification({
      message: message,
      user: user,
      userType: userType,
      link: link,
    });

    await notification.save();

    // Retrieve expoPushTokens for the user
    const expoPushTokenEntry = await ExpoPushToken.findOne({
      user: user,
    });

    if (expoPushTokenEntry) {
      //filter valid expoPushTokens and send push notification
      for (const expoPushToken of expoPushTokenEntry.expoPushTokens) {
        if (expoPushToken) {
          sendPushNotification([expoPushToken], message, message, link);
        }
      }
      // Send push notification to each expoPushToken
      sendPushNotification(
        ["ExponentPushToken[-Z7NicK1p9mc6GQJMurO1K]"],
        message,
        message,
        link
      );
    }

    // Emitting the notification using socket.io
    io.emit(`notification_${user}`, notification);

    const notificationWithUserDetails = { notification, user };

    return notificationWithUserDetails;
  } catch (error) {
    console.error(error);
    throw new Error("Error creating notification");
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const { user } = req;
    const userId = user._id;

    let notifications = await Notification.find({ user: userId }).sort({
      createdAt: -1,
    });

    const unreadCount = notifications.filter(
      (notification) => notification.status === "unread"
    ).length;

    res.json({ notifications, unreadCount });

    notifications = notifications.filter(
      (notification) => notification.status === "unread"
    );
    notifications.forEach(async (notification) => {
      notification.status = "read";
      await notification.save();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching user notifications" });
  }
};

const getUserNotificationsCount = async (req, res) => {
  try {
    const { user } = req;
    const userId = user._id;
    const notifications = await Notification.find({ user: userId }).sort({
      createdAt: -1,
    });
    const unreadCount = notifications.filter(
      (notification) => notification.status === "unread"
    ).length;

    res.json({ unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching user notifications" });
  }
};

const updateNotificationStatus = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.status = "read";
    await notification.save();

    res.json({ message: "Notification status updated to read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating notification status" });
  }
};

export {
  createNotification,
  getUserNotifications,
  updateNotificationStatus,
  getUserNotificationsCount,
  createNotification1,
};
