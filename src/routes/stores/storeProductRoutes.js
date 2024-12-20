import express from "express";
import {
  getAllCategories,
  getAllProducts,
  getStoreCategories,
  getStoreCategoryById,
  getStoreProductById,
  getStoreProductsBySlug,
  getStoreProductsByUserId,
  updateStoreProduct,
  createStoreProduct,
  deleteStoreProduct,
  createStoreCategory,
  getTopStoreProducts,
  deleteStoreCategory,
  getStoreProductBySlug,
  writeProductReview,
} from "../../controllers/stores/storeProductsController.js";

import upload from "../../utils/multer.js";
import {
  protect,
  checkStoreProductOwnership,
} from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(getAllProducts)
  .post(upload.array("images", 3), protect, createStoreProduct);

router.route("/wahala/:id").get(protect, getStoreProductById);

router
  .route("/category")
  .get(getAllCategories)
  .post(protect, createStoreCategory);

router
  .route("/category/:id")
  .get(getStoreCategoryById)
  .delete(protect, deleteStoreCategory);
// .put(protect, up)

router.route("/:storeSlug").get(getStoreProductsBySlug);
// .post( upload.array('images', 3), protect, createStoreProduct);

router.route("/categories/:storeSlug").get(getStoreCategories);

router
  .route("/:storeSlug/:slug")
  .get(getStoreProductBySlug)
  .post(writeProductReview);

router.route("/:userId").get(getStoreProductsByUserId);

router.route("/top").get(getTopStoreProducts);

router
  .route("/:id")
  .get(protect, getStoreProductById)
  .delete(protect, deleteStoreProduct)
  .put(
    upload.array("images", 3),
    protect,
    // checkStoreProductOwnership,
    updateStoreProduct
  );

// router.route('/:id/reviews').post(createFarmProductReview);

export default router;
