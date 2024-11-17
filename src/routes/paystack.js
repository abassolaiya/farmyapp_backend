import express from "express";
import {
  handlePayment,
  handleVerifyTransaction,
} from "../controllers/paystack.js";
const router = express.Router();

router.post("/create", handlePayment);
router.get("/verify", handleVerifyTransaction);

export default router;
