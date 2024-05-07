import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import {
  markOrderAsPacked,
  markOrderAsInTransit,
  updateOrderStatus,
  getOrderDetails,
  createOrderFromCart,
  markOrderAsPaid,
  getUserOrders,
  getCompanyOrders,
  getLogisticsOrders,
} from '../../controllers/company/companyOrderController.js';
import upload from "../../utils/multer.js";

const router = express.Router();

router.post('/create', protect, createOrderFromCart);
router.put('/paid/:id', protect, markOrderAsPaid);
router.put('/packed/:id', protect, markOrderAsPacked);
router.put('/intransit/:id', protect, markOrderAsInTransit);
router.put('/updatestatus/:id', protect, updateOrderStatus);

router.get('/user', protect, getUserOrders);
router.get('/company', protect, getCompanyOrders);
router.get('/logistics', protect, getLogisticsOrders);

router.get('/:id', protect, getOrderDetails);

export default router;
