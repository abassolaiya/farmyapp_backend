import express from "express";
import { protect } from '../middleware/authMiddleware.js';
import {
  createChat,
  getChatListWithUserDetails,
  getChatMessages,
  sendMessage,
  getChatUsers,
  markMessageAsRead
} from "../controllers/chatController.js";

const router = express.Router();

router.post("/create", protect, createChat);
router.get("/list", protect, getChatListWithUserDetails);
router.post("/send", protect, sendMessage);
router.get("/chatters", protect, getChatUsers);
router.get("/messages/:id", protect, getChatMessages);

router.patch("/mark-as-read/:chatId", protect, markMessageAsRead)


export default router;
