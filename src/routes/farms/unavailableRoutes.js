import express from "express";
import {
  getAllUnavailable,
  getUnavailableById,
  deleteUnavailable,
  createUnavailable,
  updateUnavailable,
  markUnavailableAsFulfilled
} from "../../controllers/farms/unAvailableController.js";
import upload from "../../utils/multer.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(getAllUnavailable)
  .post(upload.array("images", 3), protect, createUnavailable);

router
  .route("/mark/:id")
  .put(protect, markUnavailableAsFulfilled)

router
  .route("/:id")
  .get(getUnavailableById)
  .delete(protect, deleteUnavailable)
  .put(upload.array("images", 3), protect, updateUnavailable);

export default router;
