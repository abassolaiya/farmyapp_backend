import mongoose from "mongoose";

const storeCartItemSchema = mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreProduct",
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
  {
    timestamps: true,
  }
);

const StoreCartItem = mongoose.model("StoreCartItem", storeCartItemSchema);

const storeCartSchema = mongoose.Schema(
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
    items: [storeCartItemSchema],
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
    logistics: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVehicle",
    },
    deliveryAddress: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "wallet"],
      default: "card",
    },
    pickupLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store.storeLocations",
    },
    isPurchased: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

storeCartSchema.pre("save", async function (next) {
  let totalAmount = 0;

  this.items.forEach(async (item) => {
    totalAmount += item.negotiated
      ? item.negotiatedPrice * item.quantity
      : item.product.price * item.quantity;
  });

  if (this.deliveryOption === "pickup" && this.logistics) {
    const logisticsVehicle = await LogisticsVehicle.findById(this.logistics);
    if (logisticsVehicle) {
      totalAmount += logisticsVehicle.price || 0;
    }
  }

  this.totalAmount = totalAmount;
  next();
});

const StoreCart = mongoose.model("StoreCart", storeCartSchema);

export default StoreCart;
