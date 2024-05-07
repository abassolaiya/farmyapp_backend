import express from 'express';
import { addExpoPushToken, removeExpoPushToken } from '../controllers/expoPushTokenController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add-expo-push-token', protect, addExpoPushToken);
router.delete('/remove-expo-push-token', protect, removeExpoPushToken);

export default router;
