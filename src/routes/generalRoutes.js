import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  depositMoney,
  getUser,
  getBanks,
  withdrawMoney,
} from "../controllers/generalController.js";

const router = express.Router();

router.post("/deposit", protect, depositMoney);
router.post("/user/:id", protect, getUser);
router.get("/bank", getBanks);
router.post("/withdraw", protect, withdrawMoney);

export default router;
