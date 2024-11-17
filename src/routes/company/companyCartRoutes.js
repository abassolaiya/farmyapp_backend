import express from "express";
import {
  addToCompanyCart,
  removeProductFromCompanyCart,
  editCompanyCart,
  calculateCompanyTotalAmount,
  getCompanyCartWithProductDetails,
  switchToPickup,
  pickCompanyLocation,
  editCompanyPrice,
  addLogisticsToCompanyCart,
  addPickupLocationToCompanyCart,
  uploadTellerImage,
  approveCompanyCart,
  getCompanyCarts,
  getACart,
  askApproval,
} from "../../controllers/company/companyCartController.js";
import { protect } from "../../middleware/authMiddleware.js";
import upload from "../../utils/multer.js";

const router = express.Router();

router
  .route("/")
  .post(protect, addToCompanyCart)
  .put(
    protect,
    upload.fields([{ name: "teller", maxCount: 1 }]),
    editCompanyCart
  )
  .get(protect, calculateCompanyTotalAmount)
  .delete(protect, removeProductFromCompanyCart);
router.route("/price").put(protect, editCompanyPrice);

router.route("/addlocation1").put(protect, addPickupLocationToCompanyCart);
router.route("/companycarts").get(protect, getCompanyCarts);
router.route("/companycart").get(protect, getCompanyCartWithProductDetails);
router.route("/addlocation").put(protect, pickCompanyLocation);
router.route("/addvehicle").put(protect, addLogisticsToCompanyCart);
router.route("/pickup").put(protect, switchToPickup);
router.route("/approve").put(protect, approveCompanyCart);
router.route("/askApproval").put(protect, askApproval);
router
  .route("/uploadteller")
  .put(
    protect,
    upload.fields([{ name: "teller", maxCount: 1 }]),
    uploadTellerImage
  );
router.route("/:id").get(protect, getACart);

export default router;
