import express from "express";
import {
  getAllVehicles,
  getLogisticsVehiclesBySlug,
  getLogisticsVehicleBySlug,
  deleteLogisticsVehicle,
  createLogisticsVehicle,
  updateLogisticsVehicle,
  getAVehicleBySlug,
  getAVehicleById,
  searchLogisticsVehicles,
  closeLogisticsVehicle,
} from "../../controllers/logistics/logisticsVehicleController.js";

import upload from "../../utils/multer.js";
import { protect } from "../../middleware/logisticsAuthMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(getAllVehicles)
  .post(upload.single("image"), protect, createLogisticsVehicle);

router.route("/:LogisticsSlug").get(getLogisticsVehiclesBySlug);
router.route("/:cartVehicles").put(searchLogisticsVehicles);

router.route("/:LogisticsSlug/:slug").get(getLogisticsVehicleBySlug);

router.route("/v/:slug").get(getAVehicleBySlug);

router.route("/:id").delete(protect, deleteLogisticsVehicle);
router.route("/:id").get(protect, getAVehicleById);

router
  .route("/l/:slug")
  .delete(protect, deleteLogisticsVehicle)
  .put(upload.single("image"), protect, updateLogisticsVehicle);

router.put("/vehicles/:id/close", closeLogisticsVehicle);
export default router;
