import express from "express";
import {
  authCompany,
  registerCompany,
  logoutCompany,
  getCompanyProfile,
  getCompanies,
  updateCompanyProfile,
  addCompanyLocation,
  deleteCompanyLocation,
  editCompanyLocation,
  getCompanyProfileBySlug,
  editPassword,
  addBankDetails,
  forgotPassword,
  resetPassword
} from "../../controllers/company/companyController.js";
import upload from "../../utils/multer.js";
import { protect } from "../../middleware/companyAuthMiddleware.js";

const router = express.Router();

router.post("/", upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), registerCompany);
router
  .route("/profile")
  .get(protect, getCompanyProfile)
  .put(protect, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), updateCompanyProfile);

router.post("/auth", authCompany);
router.put("/bank", protect, addBankDetails);
router.post("/addlocation", protect, addCompanyLocation);
router.post("/logout", logoutCompany);
router.get("/", getCompanies);

router.get("/c/:slug", getCompanyProfileBySlug);

router.put("/editpassword", protect, editPassword);

router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);

router
  .route("/location/:locationId")
  .put(protect, editCompanyLocation)
  .delete(protect, deleteCompanyLocation);
export default router;
