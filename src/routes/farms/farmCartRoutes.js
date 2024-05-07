import express from 'express';
import {
  addToCart,
  removeProductFromCart,
  editCart,
  calculateTotalAmount1,
  getCartWithProductDetails,
  editPrice,
  getProductsInCarts,
  editNegotiatedPrice,
} from '../../controllers/farms/farmCartController.js';
// import { farmer } from '../../middleware/farmAuthMiddleware.js';
import { protect } from '../../middleware/authMiddleware.js';


const router = express.Router();

router
  .route('/')
  .post(protect, addToCart)
  .put(protect, editCart)
  .get(protect, calculateTotalAmount1)
  .delete(protect, removeProductFromCart);
router.route('/price').put(protect, editPrice)

router.route('/farmer').get(protect, getProductsInCarts)
router.route('/farmer').put(protect, editNegotiatedPrice)

// router.route('/')


export default router;
