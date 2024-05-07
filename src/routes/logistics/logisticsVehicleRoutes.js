import express from "express";
import {
  getAllVehicles,
  getLogisticsVehiclesBySlug,
  getLogisticsVehicleBySlug,
  deleteLogisticsVehicle,
  createLogisticsVehicle,
  updateLogisticsVehicle,
  getAVehicleBySlug,
  searchLogisticsVehicles,
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

router
  .route("/l/:slug")
  .delete(protect, deleteLogisticsVehicle)
  .put(upload.single("image"), protect, updateLogisticsVehicle);

export default router;
