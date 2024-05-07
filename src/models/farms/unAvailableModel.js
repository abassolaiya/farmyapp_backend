import mongoose from "mongoose";

const UnavailableSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    userType: {
      type: String,
      enum: ["user", "farmer", "store", "logistics", "company"],
    },
    productName: {
      type: String,
      required: true,
    },
    productDescription: {
      type: String,
      required: true,
    },
    measuringScale: {
      type: String,
      required: true,
    },
    perUnitPrice: {
      type: String,
    },
    images: {
      type: Array,
    },
    date: {
      type: Date,
    },
    quantity: {
      type: String,
    },
    fulfilled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);
// UnavailableSchema.index({ userId: 1, productName: 1 }, { unique: true });
const Unavailable = mongoose.model("Unavailable", UnavailableSchema);

export default Unavailable;
