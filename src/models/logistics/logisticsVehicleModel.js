import mongoose from "mongoose";

const logisticsVehicleSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ["truck", "van", "car", "bike"],
    },
    plateNum: {
      type: String,
      require: true,
    },
    image: {
      type: String,
    },
    price: {
      type: Number,
    },
    slug: {
      type: String,
      required: true,
    },
    closed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const LogisticsVehicle = mongoose.model(
  "LogisticsVehicle",
  logisticsVehicleSchema
);
export default LogisticsVehicle;
