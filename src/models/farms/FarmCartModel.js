import mongoose from "mongoose";

const cartItemSchema = mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmProduct",
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
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const CartItem = mongoose.model("CartItem", cartItemSchema);

const cartSchema = mongoose.Schema(
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
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    isPurchased: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "wallet"],
      default: "card",
    },
    logistics: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVehicle",
    },
    deliveryAddress: {
      type: String,
    },
    deliveryOption: {
      type: String,
      enum: ["pickup", "Delivery", "Pickup"],
      default: "Pickup",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total amount based on item changes
cartSchema.pre("save", function (next) {
  let totalAmount = 0;

  this.items.forEach((item) => {
    totalAmount += item.negotiated
      ? item.negotiatedPrice * item.quantity
      : item.product.perUnitPrice * item.quantity;
  });

  this.totalAmount = totalAmount;
  next();
});

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
