import express from "express";
import {
  authAdmin,
  registerAdmin,
  logoutAdmin,
  getAdminProfile,
  updateAdminProfile,
  resetAdminPassword,
  addAdminBankDetails,
  forgotPassword,
  editPassword,
} from "../../controllers/buyers/adminController.js";

import { adminGetStores } from "../../controllers/admin/adminStoreController.js";
import {
  adminGetUserDetails,
  adminGetUsers,
} from "../../controllers/admin/adminUserController.js";

import {
  adminUpdateFarmStatus,
  adminGetFarmers,
  adminGetFarmerDetails,
} from "../../controllers/admin/adminFarmController.js";

import {
  adminGetCompanies,
  adminGetCompanyDetail,
  adminUpdateCompanyStatus,
} from "../../controllers/admin/adminCompanyController.js";

import {
  adminGetLogistics,
  adminGetLogisticsDetail,
  adminUpdateLogisticsStatus,
} from "../../controllers/admin/adminLogisticsController.js";
import upload from "../../utils/multer.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
  ]),
  registerAdmin
);
router.post("/auth", authAdmin);
router.post("/logout", logoutAdmin);
router
  .route("/profile")
  .get(protect, getAdminProfile)
  .put(
    protect,
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "coverPhoto", maxCount: 1 },
    ]),
    updateAdminProfile
  );
router.put("/editpassword", protect, editPassword);
router.put("/bank", protect, addAdminBankDetails);
router.post("/forgotpassword", forgotPassword);
router.post("/resetAdminPassword", resetAdminPassword);

router.get("/stores", protect(true), adminGetStores);

router.get("/users", protect(true), adminGetUsers);
router.get("/users/:id", protect(true), adminGetUserDetails);

router.get("/farmers", protect(true), adminGetFarmers);
router.put("/farmers/:id", protect(true), adminUpdateFarmStatus);
router.get("/farmer/:id", protect(true), adminGetFarmerDetails);

router.get("/company", protect(), adminGetCompanies);
router.put("/company/:id", protect(true), adminUpdateCompanyStatus);
router.get("company/:id", protect(true), adminGetCompanyDetail);

router.get("/logistics", protect(true), adminGetCompanies);
router.put("logistics/:id", protect(true), adminUpdateLogisticsStatus);
router.get("/logistics/:id", protect(true), adminGetLogisticsDetail);

export default router;
