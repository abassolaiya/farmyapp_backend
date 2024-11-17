import express from "express";
import {
  authLogistics,
  registerLogistics,
  logoutLogistics,
  getLogisticsProfile,
  updateLogisticsProfile1,
  addOfficeLocation,
  getLogistics,
  getLogisticsDetail,
  editOfficeLocation,
  deleteOfficeLocation,
  getLogisticsDetail1,
  editPassword,
  addBankDetails,
  forgotPassword,
  resetPassword,
  deleteLogisticsAccount,
  recoverLogisticsAccount,
  closeLogisticsCompany,
} from "../../controllers/logistics/logisticsController.js";
import upload from "../../utils/multer.js";
import { protect } from "../../middleware/logisticsAuthMiddleware.js";

const router = express.Router();

router
  .route("/profile")
  .put(
    protect,
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "coverPhoto", maxCount: 1 },
    ]),
    updateLogisticsProfile1
  )
  .get(protect, getLogisticsProfile);

router.post(
  "/",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
  ]),
  registerLogistics
);
router.post("/auth", authLogistics);
router.post("/logout", logoutLogistics);
router.post("/addlocation", protect, addOfficeLocation);
router.get("/", getLogistics);
router.put("/bank", protect, addBankDetails);
router.get("/:logisticsSlug", getLogisticsDetail);
router.get("/:logisticsSlug/:officeLocationId", getLogisticsDetail1);

router.delete("/delete", protect, deleteLogisticsAccount);
router.put("/recover", recoverLogisticsAccount);

router
  .route("/location/:id")
  .put(protect, editOfficeLocation)
  .delete(protect, deleteOfficeLocation);

router.put("/editpassword", protect, editPassword);

router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword", resetPassword);
router.put("/logistics/:id/close", closeLogisticsCompany);

export default router;
