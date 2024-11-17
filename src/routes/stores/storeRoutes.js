import express from "express";
import {
  authStore,
  registerStore,
  logoutStore,
  getStoreProfile,
  getStores,
  updateStoreProfile,
  addStoreLocation,
  deleteStoreLocation,
  editStoreLocation,
  getStoreProfileBySlug,
  editPassword,
  addBankDetails,
  forgotPassword,
  resetPassword,
  deleteStoreAccount,
  recoverStoreAccount,
  closeStore,
  getStoreLocation,
  closeStoreLocation,
} from "../../controllers/stores/storeController.js";
import upload from "../../utils/multer.js";
import { protect } from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();

router.post(
  "/",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
  ]),
  registerStore
);
router
  .route("/profile")
  .get(protect, getStoreProfile)
  .put(
    protect,
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "coverPhoto", maxCount: 1 },
    ]),
    updateStoreProfile
  );

router.post("/auth", authStore);
router.put("/bank", protect, addBankDetails);
router.post("/addlocation", protect, addStoreLocation);
router.post("/logout", logoutStore);
router.get("/", getStores);

router.get("/s/:slug", getStoreProfileBySlug);

router.put("/editpassword", protect, editPassword);

router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword", resetPassword);

router.delete("/delete", protect, deleteStoreAccount);
router.put("/recover", recoverStoreAccount);

router
  .route("/location/:locationId")
  .get(protect, getStoreLocation)
  .put(protect, editStoreLocation)
  .delete(protect, deleteStoreLocation);

router.put("/stores/:id/close", closeStore);
router.put("/stores/:storeId/locations/:locationId/close", closeStoreLocation);
export default router;
