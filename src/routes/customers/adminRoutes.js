import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  editPassword,
  forgotPassword,
  resetPassword,
  addBankDetails
} from '../../controllers/buyers/adminController.js';
import upload from '../../utils/multer.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), registerUser);
router.post('/auth', authUser);
router.post('/logout', logoutUser);
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), updateUserProfile);
router.put('/editpassword', protect, editPassword);
router.put('/bank', protect, addBankDetails);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);

export default router;
