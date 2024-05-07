import mongoose from "mongoose";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { notFound, errorHandler } from "./src/middleware/errorMiddleware.js";
import routes from "./src/routes/index.js";
import farmOrderRoutes from "./src/routes/farms/farmOrderRoute.js";
import farmRoutes from "./src/routes/farms/farmRoutes.js";
import farmCartRoutes from "./src/routes/farms/farmCartRoutes.js";
import farmProductRoutes from "./src/routes/farms/farmProductRoutes.js";
import unavailableRoutes from "./src/routes/farms/unavailableRoutes.js";
import userRoutes from "./src/routes/customers/userRoutes.js";
import adminRoutes from "./src/routes/customers/adminRoutes.js";
import storeProductRoute from "./src/routes/stores/storeProductRoutes.js";
import storeOrderRoutes from "./src/routes/stores/storeOrderRoutes.js";
import storeRoutes from "./src/routes/stores/storeRoutes.js";
import storeCartRoutes from "./src/routes/stores/storeCartRoutes.js";
import expoPushTokenRoutes from "./src/routes/expoPushTokenRoutes.js";
import companyProductRoute from "./src/routes/company/companyProductRoutes.js";
import companyOrderRoutes from "./src/routes/company/companyOrderRoutes.js";
import companyRoutes from "./src/routes/company/companyRoutes.js";
import companyCartRoutes from "./src/routes/company/companyCartRoutes.js";
import logisticsRoutes from "./src/routes/logistics/logisticsRoutes.js";
import logisticsVehicleRoutes from "./src/routes/logistics/logisticsVehicleRoutes.js";
import logisticsBookingRoutes from "./src/routes/logistics/logisticsBookingRoutes.js";
import waitlistRoutes from "./src/routes/waitlist.js";
import pastackRoutes from "./src/routes/paystack.js";
import generalRoutes from "./src/routes/generalRoutes.js";
import NotificationRoutes from "./src/routes/notificationRoutes.js";
import ChatRoutes from "./src/routes/chatRoutes.js";

// dotenv.config({ path: "./prod.env" });
dotenv.config({ path: "./config.env" });

const port = process.env.PORT || 5000;

const DB = process.env.DATABASE;

mongoose
  .connect(DB, {
    serverSelectionTimeoutMS: 10000,
    retryWrites: true, // Enable automatic retries
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });

// mongoose
//   .connect("mongodb://127.0.0.1:27017/test", {
//     serverSelectionTimeoutMS: 10000,
//     retryWrites: true,
//   })
//   .catch((error) => {
//     console.log("mongodb connection error: ", error);
//   });

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const users = [];
let activeUsers = [];
io.on("connection", (socket) => {
  socket.on("new-user-add", (newUserId) => {
    if (!activeUsers.some((user) => user.userId === newUserId)) {
      activeUsers.push({ userId: newUserId, socketId: socket.id });
    }
    // send all active users to new user
    io.emit("get-users", activeUsers);
  });

  socket.on("disconnect", () => {
    activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
    // console.log("User Disconnected", activeUsers);
    io.emit("get-users", activeUsers);
  });

  // send message to a specific user
  socket.on("send-message", (data) => {
    const { receiverId } = data;
    const user = activeUsers.find((user) => user.userId === receiverId);
    console.log("Sending from socket to :", receiverId);
    if (user) {
      // console.log(data)
      io.to(user.socketId).emit("recieve-message", data);
    }
  });

  // Mark message as read for a specific user within a chat
  socket.on("mark-as-read", async ({ chatId, userId }) => {
    try {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        return;
      }

      chat.messages.forEach((message) => {
        if (!message.readBy.includes(userId)) {
          message.readBy.push(userId);
        }
      });

      await chat.save();
      console.log("Messages marked as read for the user");
      // Emit an event to inform clients that messages have been marked as read
      io.emit("messages-marked-as-read", { chatId, userId });
    } catch (error) {
      console.error(error);
    }
  });
});

app.use(
  cors({
    credentials: true,
    origin: [
      "http://farmyapp.com",
      "https://farmyapp.com",
      "https://farmyapptest.onrender.com",
      "http://127.0.0.1:3000",
    ],
    // origin:'http://127.0.0.1:3000'
  })
);

app.use(helmet());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use("/api/v1/farm", farmRoutes);
app.use("/api/v1/farmproducts", farmProductRoutes);
app.use("/api/v1/unavailable", unavailableRoutes);
app.use("/api/v1/farmcart", farmCartRoutes);
app.use("/api/v1/farmorder", farmOrderRoutes);
app.use("/api/v1/expo", expoPushTokenRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/waitlist", waitlistRoutes);
app.use("/api/v1/store", storeRoutes);
app.use("/api/v1/storecart", storeCartRoutes);
app.use("/api/v1/storeorder", storeOrderRoutes);
app.use("/api/v1/storeproducts", storeProductRoute);
app.use("/api/v1/company", companyRoutes);
app.use("/api/v1/companycart", companyCartRoutes);
app.use("/api/v1/companyorder", companyOrderRoutes);
app.use("/api/v1/companyproducts", companyProductRoute);
app.use("/api/v1/logistics", logisticsRoutes);
app.use("/api/v1/logisticsvehicle", logisticsVehicleRoutes);
app.use("/api/v1/logisticsbooking", logisticsBookingRoutes);
app.use("/api/v1/notifications", NotificationRoutes);
app.use("/api/v1/chat", ChatRoutes);
app.use("/api/v1/paystack", pastackRoutes);
app.use("/api/v1/general", generalRoutes);
app.use(notFound);
app.use(express.json());
// app.use(express.urlencoded())
app.use(errorHandler);
app.set("socketio", io);

// app.listen(port, () => console.log(`Server started on port ${port}`));
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
routes(app);
