import { Router } from "express";
import {
    changeOrderStatus,
    getBookingDetail,
    getBookingsByLogisticsCompany,
    getAllBookingsByUser,
    cancelBooking,
    editCartItem,
    updateBookingStatusByLogistics,
    updateBookingStatusByUser,
    addVehicleToCart
} from "../../controllers/logistics/logisticsBooking.js"
import { protect } from "../../middleware/authMiddleware.js";

const router = Router();

router.route("/log").get(protect, getBookingsByLogisticsCompany)
router.route("/change").put(protect, changeOrderStatus)
router.route("/userchange/:orderId").put(protect, updateBookingStatusByUser)
router.route("/logchange/:orderId").put(protect, updateBookingStatusByLogistics)


router
    .route("/:bookingId")
    .put(protect, editCartItem)
    .delete(protect, cancelBooking)
    .get(protect, getBookingDetail)


router.route("/")
    .post(protect, addVehicleToCart)
    .get(protect, getAllBookingsByUser)

export default router;