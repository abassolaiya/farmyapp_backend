import express from "express";
import {
  getAllCategories,
  getAllProducts,
  getCompanyCategories,
  getCompanyCategoryById,
  getCompanyProductById,
  getCompanyProductsBySlug,
  getCompanyProductsByUserId,
  updateCompanyProduct,
  createCompanyProduct,
  deleteCompanyProduct,
  createCompanyCategory,
  getTopCompanyProducts,
  deleteCompanyCategory,
  getCompanyProductBySlug,
  writeProductReview,
} from "../../controllers/company/companyProductController.js";

import upload from "../../utils/multer.js";
import {
  protect,
  checkCompanyProductOwnership,
} from "../../middleware/companyAuthMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(getAllProducts)
  .post(upload.array("images", 3), protect, createCompanyProduct);

router
  .route("/category")
  .get(getAllCategories)
  .post(protect, createCompanyCategory);

router
  .route("/category/:id")
  .get(getCompanyCategoryById)
  .delete(protect, deleteCompanyCategory);
// .put(protect, up)

router
  .route("/wahala/:id")
  .get(protect, checkCompanyProductOwnership, getCompanyProductById);

router.route("/:companySlug").get(getCompanyProductsBySlug);
// .post( upload.array('images', 3), protect, createStoreProduct);

router.route("/categories/:companySlug").get(getCompanyCategories);

router
  .route("/:companySlug/:slug")
  .get(getCompanyProductBySlug)
  .post(writeProductReview);

router.route("/:userId").get(getCompanyProductsByUserId);

router.route("/top").get(getTopCompanyProducts);

router
  .route("/:id")
  .get(protect, checkCompanyProductOwnership, getCompanyProductById)
  .delete(protect, deleteCompanyProduct)
  .put(
    upload.array("images", 3),
    protect,
    checkCompanyProductOwnership,
    updateCompanyProduct
  );

// router.route('/:id/reviews').post(createFarmProductReview);

export default router;
