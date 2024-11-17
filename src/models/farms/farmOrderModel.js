import mongoose from "mongoose";

const farmOrderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the user who placed the order
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FarmProduct",
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
      enum: ["Paid", "Delivered", "In-Transit", "Canceled", "Packed"],
      default: "Paid", // Default status when the order is created
      required: true,
    },
    deliveryOption: {
      type: String,
      enum: ["Delivery", "pickup", "Pickup"],
      required: true,
    },
    logisticsVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVehicle",
    },
    deliveryAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const FarmOrder = mongoose.model("FarmOrder", farmOrderSchema);

export default FarmOrder;
