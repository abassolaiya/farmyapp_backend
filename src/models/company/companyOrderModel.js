import mongoose from "mongoose";
import Company from "./company.js";

const companyOrderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userType: {
      type: String,
      enum: ["user", "farmer", "store", "logistics", "company"],
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CompanyProduct",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        negotiated: {
          type: Boolean,
          default: false,
        },
        negotiatedPrice: {
          type: Number,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    deliveryOption: {
      type: String,
      enum: ["pickup", "delivery"],
      default: "pickup",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company",
      // required: true,
    },
    logistics: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Logistics",
    },
    logisticsVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVehicle",
    },
    deliveryAddress: {
      type: String,
    },
    pickupLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company.companyLocations",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "wallet", "bank"],
      default: "bank",
    },
    teller: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "Paid",
        "Packed",
        "In transit",
        "Delivered",
        "Canceled",
        "pending",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const CompanyOrder = mongoose.model("CompanyOrder", companyOrderSchema);

export default CompanyOrder;
