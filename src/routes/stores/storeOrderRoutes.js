import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import {
  markOrderAsPacked,
  markOrderAsInTransit,
  updateOrderStatus,
  getOrderDetails,
  createOrderFromCart,
  getUserOrders,
  getStoreOrders,
  getLogisticsOrders,
} from '../../controllers/stores/storeOrderController.js';

const router = express.Router();

router.post('/create', protect, createOrderFromCart);
router.put('/packed/:id', protect, markOrderAsPacked);
router.put('/intransit/:id', protect, markOrderAsInTransit);
router.put('/updatestatus/:id', protect, updateOrderStatus);

router.get('/user', protect, getUserOrders);
router.get('/store', protect, getStoreOrders);
router.get('/logistics', protect, getLogisticsOrders);

router.get('/:id', protect, getOrderDetails);

export default router;
