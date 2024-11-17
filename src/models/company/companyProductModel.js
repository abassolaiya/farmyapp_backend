import mongoose from "mongoose";

const companyProductSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
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
    commission: {
      type: String,
    },
    availableQuantity: {
      type: String,
    },
    numReviews: {
      type: Number,
      default: 0,
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
companyProductSchema.index({ userId: 1, slug: 1 }, { unique: true });

const CompanyProduct = mongoose.model("CompanyProduct", companyProductSchema);
export default CompanyProduct;
