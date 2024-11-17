import express from "express";
import {
  authFarm,
  registerFarm,
  logoutFarm,
  getFarmProfile,
  updateFarmProfile,
  editPassword,
  addBankDetails,
  forgotPassword,
  resetPassword,
  deleteFarmAccount,
  recoverFarmAccount,
} from "../../controllers/farms/farmController.js";
import upload from "../../utils/multer.js";
import { farmer } from "../../middleware/farmAuthMiddleware.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
  ]),
  registerFarm
);
router.post("/auth", authFarm);
router.put("/bank", protect, addBankDetails);
router.post("/logout", logoutFarm);
router
  .route("/profile")
  .get(farmer, getFarmProfile)
  .put(
    farmer,
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "coverPhoto", maxCount: 1 },
    ]),
    updateFarmProfile
  );
router.put("/editpassword", farmer, editPassword);

router.delete("/delete", protect, deleteFarmAccount);
router.put("/recover", recoverFarmAccount);

router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword", resetPassword);

export default router;
