import Chat from "../models/chatModel.js";
import FarmerModel from "../models/farms/farmerModel.js"; // Import your specific user type models
import StoreModel from "../models/stores/sellerModel.js";
import LogisticsModel from "../models/logistics/logisticsModel.js";
import CompanyModel from "../models/company/company.js";
import UserModel from "../models/buyer/userModel.js";
import { createNotification } from "./notificationController.js";

const getUserDetails = async (userId) => {
  let userModel;

  userModel = await FarmerModel.findById(userId);
  if (userModel) {
    return { userDetails: userModel, userType: "Farmer" }; // Found in FarmerModel
  }

  userModel = await StoreModel.findById(userId);
  if (userModel) {
    return { userDetails: userModel, userType: "Store" }; // Found in StoreModel
  }

  userModel = await LogisticsModel.findById(userId);
  if (userModel) {
    return { userDetails: userModel, userType: "Logistics" }; // Found in LogisticsModel
  }

  userModel = await CompanyModel.findById(userId);
  if (userModel) {
    return { userDetails: userModel, userType: "Company" }; // Found in LogisticsModel
  }

  userModel = await UserModel.findById(userId);
  if (userModel) {
    return { userDetails: userModel, userType: "User" }; // Found in UserModel
  }

  return null;
};

const createChat = async (req, res) => {
  try {
    const { participants } = req.body;
    // console.log(participants)

    const existingChat = await Chat.findOne({
      participants: { $all: participants },
    })
      .where("participants")
      .size(participants.length);

    if (existingChat) {
      res.status(200).json({ chat: existingChat });
    } else {
      const newChat = await Chat.create({ participants });
      res.status(201).json({ chat: newChat });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating chat" });
  }
};

export const userChats = async (req, res) => {
  try {
    const chat = await ChatModel.find({
      members: { $in: [req.params.userId] },
    });
    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json(error);
  }
};

const getChatListWithUserDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await Chat.find({ participants: userId });

    const chatsWithUserDetails = [];
    for (const chat of chats) {
      const participantsWithDetails = [];

      for (const participant of chat.participants) {
        const userWithDetails = await getUserDetails(participant);
        if (userWithDetails) {
          const { userDetails, userType } = userWithDetails;
          const userDetail = {
            _id: userDetails._id,
            username: userDetails.username,
            userType: userType,
            avatar: userDetails.avatar,
            // Add other necessary user details here
          };
          participantsWithDetails.push(userDetail);
        }
      }

      // Count unread messages for the user in the chat
      const unreadMessagesCount = chat.messages.reduce(
        (count, message) =>
          !message.readBy.includes(userId) ? count + 1 : count,
        0
      );

      chatsWithUserDetails.push({
        chatId: chat._id,
        participants: participantsWithDetails,
        unreadMessages: unreadMessagesCount,
        // Add timestamp of last message or chat creation date to each chat
        lastUpdated:
          chat.messages.length > 0
            ? chat.messages[chat.messages.length - 1].timestamp
            : chat.createdAt,
      });
    }

    // Sort chats by lastUpdated timestamp in descending order (newest first)
    const sortedChats = chatsWithUserDetails.sort(
      (a, b) => b.lastUpdated - a.lastUpdated
    );

    res.json({ chats: sortedChats });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error fetching chat list with user details" });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    const users = [];
    const messages = chat.messages;
    for (const participant of chat.participants) {
      const userWithDetails = await getUserDetails(participant._id);
      if (userWithDetails) {
        const { userDetails, userType } = userWithDetails;
        const userDetail = {
          _id: userDetails._id,
          username: userDetails.username,
          userType: userType,
          avatar: userDetails.avatar,
        };
        users.push(userDetail);
      }
    }
    res.json({ users, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching chat messages" });
  }
};

const sendMessage = async (req, res) => {
  const { userType } = req;
  try {
    const { chatId, message, sender } = req.body;
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    chat.messages.push({ message, sender });
    await chat.save();
    const lastMessage = chat.messages[chat.messages.length - 1];
    lastMessage.readBy = [sender];
    await chat.save();

    // Extracting necessary details from the last message
    const {
      message: sentMessage,
      sender: messageSender,
      timestamp,
    } = lastMessage;

    // Creating an object with required message details
    const sentMessageDetails = {
      message: sentMessage,
      sender: messageSender,
      timestamp, // Add any other details you might need
    };

    // Create notifications for each participant except the sender
    for (const participant of chat.participants) {
      const participantId = participant.toString();

      if (participantId !== sender.toString()) {
        const notificationMessage = "You have a new message.";
        const notificationLink = `/chat/${chatId}`;

        // const notificationData = {
        const user = participantId;
        const message = notificationMessage;
        const link = notificationLink;

        // Call createNotification function with the prepared data for each participant
        const notification = await createNotification(
          userType,
          user,
          message,
          link,
          req.app.get("socketio")
        );
      }
    }

    res.status(201).json(sentMessageDetails); // Sending just the sent message details
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error sending message" });
  }
};

const getChatUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await Chat.find({ participants: userId });

    const participants = [];
    chats.forEach((chat) => {
      chat.participants.forEach((participant) => {
        if (participant._id.toString() !== userId.toString()) {
          participants.push(participant._id);
        }
      });
    });

    const uniqueParticipants = [...new Set(participants)];

    res.json({ participants: uniqueParticipants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching chat users" });
  }
};

// Update readBy for a specific message
const markMessageAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;
    // console.log(chatId);
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    chat.messages.forEach((message) => {
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
      }
    });
    await chat.save();

    res.status(200).json({ message: "Messages marked as read for the user" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error marking messages as read" });
  }
};

const deleteUserChats = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find and delete all chats involving the user
    const result = await Chat.deleteMany({ participants: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No chats found for this user" });
    }

    res.status(200).json({ message: "Chats deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting chats" });
  }
};

export {
  createChat,
  getChatListWithUserDetails,
  getChatMessages,
  sendMessage,
  getChatUsers,
  markMessageAsRead,
  deleteUserChats,
};
