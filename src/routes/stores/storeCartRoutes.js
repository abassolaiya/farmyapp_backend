import express from "express";
import {
  addToStoreCart,
  removeProductFromStoreCart,
  editStoreCart,
  calculateStoreTotalAmount,
  getStoreCartWithProductDetails,
  switchToPickup,
  pickStoreLocation,
  editStorePrice,
  addLogisticsToStoreCart,
  addPickupLocationToStoreCart,
} from "../../controllers/stores/storeCartController.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, addToStoreCart)
  .put(protect, editStoreCart)
  .get(protect, calculateStoreTotalAmount)
  .delete(protect, removeProductFromStoreCart);
router.route("/price").put(protect, editStorePrice);

router.route("/addlocation1").put(protect, addPickupLocationToStoreCart);
router.route("/addlocation").put(protect, pickStoreLocation);
router.route("/addvehicle").put(protect, addLogisticsToStoreCart);
router.route("/pickup").put(protect, switchToPickup);

export default router;
