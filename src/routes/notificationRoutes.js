import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createNotification1, getUserNotifications, updateNotificationStatus, getUserNotificationsCount } from '../controllers/notificationController.js';

const router = express.Router();

router.post('/create', protect, createNotification1);
router.get('/user', protect, getUserNotifications);
router.get('/count', protect, getUserNotificationsCount);
router.put('/user/:notificationId', protect, updateNotificationStatus);

export default router;