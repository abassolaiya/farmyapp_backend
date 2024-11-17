import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import {
  createOrderFromCart,
  markOrderAsPacked,
  markOrderAsInTransit,
  updateOrderStatus,
  getOrderDetails,
  getUserOrders,
  getFarmOrders,
  getFarmLogisticsOrders,
  getTotalAmountInWallet,
} from "../../controllers/farms/farmOrderController.js";

const router = express.Router();

router.route("/create").post(protect, createOrderFromCart);
router.put("/packed/:id", protect, markOrderAsPacked);
router.put("/intransit/:id", protect, markOrderAsInTransit);
router.put("/updatestatus/:id", protect, updateOrderStatus);

router.get("/user", protect, getUserOrders);
router.get("/farm", protect, getFarmOrders);
router.get("/logistics", protect, getFarmLogisticsOrders);

router.get("/:id", protect, getOrderDetails);

export default router;
