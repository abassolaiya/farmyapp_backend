<<<<<<< HEAD
import mongoose from "mongoose";
=======
import mongoose from 'mongoose';
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880

const farmOrderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
<<<<<<< HEAD
      ref: "User", // Reference to the user who placed the order
=======
      ref: 'User', // Reference to the user who placed the order
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
<<<<<<< HEAD
          ref: "FarmProduct",
=======
          ref: 'FarmProduct',
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
<<<<<<< HEAD
      enum: ["Paid", "Delivered", "In-Transit", "Canceled", "Packed"],
      default: "Paid", // Default status when the order is created
=======
      enum: ['Paid', 'Delivered', 'In-Transit', 'Canceled', 'Packed'],
      default: 'Paid', // Default status when the order is created
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880
      required: true,
    },
    deliveryOption: {
      type: String,
<<<<<<< HEAD
      enum: ["Delivery", "pickup", "Pickup"],
=======
      enum: ['Delivery', 'pickup', "Pickup"],
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880
      required: true,
    },
    logisticsVehicle: {
      type: mongoose.Schema.Types.ObjectId,
<<<<<<< HEAD
      ref: "LogisticsVehicle",
=======
      ref: 'LogisticsVehicle',
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880
    },
    deliveryAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

<<<<<<< HEAD
const FarmOrder = mongoose.model("FarmOrder", farmOrderSchema);
=======
const FarmOrder = mongoose.model('FarmOrder', farmOrderSchema);
>>>>>>> de3b8fe9d917dc059a46d1ceaad1bff46b432880

export default FarmOrder;
