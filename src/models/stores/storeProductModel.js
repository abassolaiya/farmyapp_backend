import mongoose from "mongoose";

const storeProductSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productDescription: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    measuringScale: {
      type: String,
      required: true,
    },
    images: {
      type: Array,
    },
    slug: {
      type: String,
      required: true,
    },
    preparationTime: {
      type: Date,
    },
    availableQuantity: {
      type: String,
    },
    numReviews: {
      type: Number,
      default: 0, // Initialize with zero reviews
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
      },
    ],
    inStock: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound unique index on userId and slug
storeProductSchema.index({ userId: 1, slug: 1 }, { unique: true });

const StoreProduct = mongoose.model("StoreProduct", storeProductSchema);
export default StoreProduct;
