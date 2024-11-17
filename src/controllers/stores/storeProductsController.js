import asyncHandler from "express-async-handler";

import StoreCategory from "../../models/stores/storeCategories.js";
import StoreProduct from "../../models/stores/storeProductModel.js";
import { cloudinary } from "../../utils/cloudinary.js";
import Store from "../../models/stores/sellerModel.js";
import slugify from "slugify";

const getAverageRating = (reviews) => {
  if (reviews.length === 0) return 0;

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
};

const updateStoreRating = async (storeId) => {
  const products = await StoreProduct.find({ userId: storeId });
  const allRatings = products.reduce(
    (acc, product) => acc.concat(product.reviews.map((r) => r.rating)),
    []
  );
  const averageRating = getAverageRating(allRatings);

  await Store.findByIdAndUpdate(storeId, { rating: averageRating });
};

const getAllProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const keyword = req.query.keyword
    ? {
        productName: {
          $regex: req.query.keyword,
          $options: "si",
        },
      }
    : {};
  const count = await StoreProduct.countDocuments({ ...keyword });

  const products = await StoreProduct.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  const updatedProducts = await Promise.all(
    products.map(async (product) => {
      const allReviews = await Review.find({ product: product._id });
      const averageRating = getAverageRating(allReviews);
      return { ...product.toObject(), reviews: allReviews, averageRating };
    })
  );

  res.json({ updatedProducts, page, pages: Math.ceil(count / pageSize) });
});

const getStoreProductsByUserId = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const userId = req.params.userId;

  const keyword = req.query.keyword
    ? {
        userId: userId,
        productName: {
          $regex: req.query.keyword,
          $options: "si",
        },
        inStock: true,
      }
    : {
        userId: userId,
        inStock: true,
      };

  const count = await StoreProduct.countDocuments({ ...keyword });

  const products = await StoreProduct.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ products, page, pages: Math.ceil(count / pageSize) });
});

const getStoreProductsBySlug = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const storeSlug = req.params.storeSlug;

  // Find the store by its slug to get the userId
  const store = await Store.findOne({ slug: storeSlug });

  if (!store) {
    res.status(404).json({ error: "Store not found" });
    return;
  }

  const userId = store._id; // Assuming the userId field exists in the Store model
  const categories = await StoreCategory.find({ userId });

  const keyword = req.query.keyword
    ? {
        userId: userId,
        productName: {
          $regex: req.query.keyword,
          $options: "si",
        },
        inStock: true,
      }
    : {
        userId: userId,
        inStock: true,
      };

  if (req.query.categories && typeof req.query.categories === "string") {
    keyword.category = { $in: req.query.categories.split(",") };
  } else {
  }

  const count = await StoreProduct.countDocuments({ ...keyword });

  const products = await StoreProduct.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    storeName: store.storeName,
    storeAddress: store.storeAddress,
    city: store.city,
    username: store.username,
    avatar: store.avatar,
    categories,
    products,
    page,
    pages: Math.ceil(count / pageSize),
  });
});

const getAllCategories = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const keyword = req.query.keyword
    ? {
        category: {
          $regex: req.query.keyword,
          $options: "si",
        },
      }
    : {};
  const count = await StoreCategory.countDocuments({ ...keyword });

  const categories = await StoreCategory.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ categories, page, pages: Math.ceil(count / pageSize) });
});

const getStoreCategories = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const storeSlug = req.params.storeSlug;

  // Find the store by its slug to get the userId
  const store = await Store.findOne({ slug: storeSlug });

  if (!store) {
    res.status(404).json({ error: "Store not found" });
    return;
  }

  const userId = store._id;

  const keyword = req.query.keyword
    ? {
        userId: userId, // Filter based on the store's userId
        category: {
          $regex: req.query.keyword,
          $options: "si",
        },
      }
    : { userId: userId }; // If no keyword, filter by userId only

  const count = await StoreCategory.countDocuments({ ...keyword });

  const categories = await StoreCategory.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ categories, page, pages: Math.ceil(count / pageSize) });
});

const getStoreCategoryById = asyncHandler(async (req, res) => {
  // console.log("it got here");
  const category = await StoreCategory.findById(req.params.id);
  const products = await StoreProduct.find({ category: req.params._id });
  if (category) {
    // Send both category and products as an object
    res.json({ category, products });
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Category not found");
  }
});

const getStoreProductById = asyncHandler(async (req, res) => {
  const product = await StoreProduct.findOne({
    userId: req.store._id,
    _id: req.params.id,
  });
  // console.log(product);
  if (product) res.json(product);
  else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Product not found");
  }
});

const getStoreProductBySlug = asyncHandler(async (req, res) => {
  const storeSlug = req.params.storeSlug;
  const productSlug = req.params.slug;

  const store = await Store.findOne({ slug: storeSlug });

  if (!store) {
    res.status(404).json({ error: "Store not found" });
    return;
  }

  const userId = store._id;

  const product = await StoreProduct.findOne({ userId, slug: productSlug });

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const relatedProducts = await StoreProduct.find({
    userId,
    _id: { $ne: product._id },
    $or: [
      { productName: { $regex: product.productName, $options: "i" } }, // Similar spelling
      {
        productDescription: {
          $regex: product.productDescription,
          $options: "i",
        },
      }, // Similar description
      {
        price: {
          $gte: parseFloat(product.price) - 100,
          $lte: parseFloat(product.price) + 100,
        },
      },
    ],
  }).limit(5);

  res.json({ product, relatedProducts });
});

const writeProductReview = asyncHandler(async (req, res) => {
  const { text, rating } = req.body;
  const userId = req.user._id;

  const storeSlug = req.params.storeSlug;
  const productSlug = req.params.slug;

  const store = await Store.findOne({ slug: storeSlug });

  if (!store) {
    res.status(404).json({ error: "Store not found" });
    return;
  }

  const product = await StoreProduct.findOne({
    userId: store._id,
    slug: productSlug,
  });

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const review = {
    user: userId,
    text,
    rating,
  };

  product.reviews.push(review);

  const newRating = getAverageRating(product.reviews);

  product.rating = newRating;
  product.numReviews += 1;

  await product.save();

  await updateStoreRating(store._id);

  res.status(201).json({ message: "Review submitted successfully" });
});

const deleteStoreProduct = asyncHandler(async (req, res) => {
  const product = await StoreProduct.findById(req.params.id);
  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed from DB" });
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Product not found");
  }
});

const deleteStoreCategory = asyncHandler(async (req, res) => {
  const category = await StoreCategory.findById(req.params.id);
  if (category) {
    await category.deleteOne();
    res.json({ message: "Category removed from DB" });
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Category not found");
  }
});

const createStoreProduct = asyncHandler(async (req, res) => {
  const {
    productName,
    productDescription,
    measuringScale,
    preparationTime,
    inStock,
    price,
    category,
  } = req.body;
  var images = [];

  const slug = slugify(productName, { lower: true });

  for (var i = 0; i < req.files.length; i++) {
    var localFilePath = req.files[i].path;
    var result = await cloudinary(localFilePath);
    images.push(result.secure_url);
  }
  // console.log(req.store);
  const product = new StoreProduct({
    productName,
    productDescription,
    preparationTime,
    inStock,
    price,
    category,
    measuringScale,
    userId: req.store._id,
    images,
    slug,
    numReviews: 0,
  });
  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

const createStoreCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const slug = slugify(name, { lower: true });

  const category = new StoreCategory({
    name,
    userId: req.store._id,
    slug,
  });
  const createdCategory = await category.save();
  res.status(201).json(createdCategory);
});

const updateStoreProduct = asyncHandler(async (req, res) => {
  const {
    productName,
    productDescription,
    preparationTime,
    inStock,
    price,
    category,
    measuringScale,
  } = req.body;
  const product = await StoreProduct.findById(req.params.id);
  var images = [];

  // update the fields which are sent with the payload
  if (product) {
    if (productName) product.productName = productName;
    if (productName) product.slug = slugify(productName, { lower: true });
    if (productDescription) product.productDescription = productDescription;
    if (measuringScale) product.measuringScale = measuringScale;
    if (price) product.price = price;
    if (preparationTime) product.preparationTime = preparationTime;
    if (category) product.category = category;
    if (inStock) product.inStock = inStock;
    if (req.files && req.files.length > 0) {
      for (var i = 0; i < req.files.length; i++) {
        var localFilePath = req.files[i].path;
        var result = await cloudinary(localFilePath);
        images.push(result.secure_url);
      }
      product.images = images;
    }

    const updatedProduct = await product.save();
    if (updatedProduct) res.status(201).json(updatedProduct);
  } else {
    res.status(404);
    throw new Error("Product not available");
  }
});

const getTopStoreProducts = asyncHandler(async (req, res) => {
  // get top 4 rated products
  const topProducts = await StoreProduct.find({}).sort({ rating: -1 }).limit(4);
  res.json(topProducts);
});

export {
  getAllCategories,
  getAllProducts,
  getStoreCategories,
  getStoreCategoryById,
  getStoreProductById,
  getStoreProductsBySlug,
  getStoreProductsByUserId,
  updateStoreProduct,
  createStoreProduct,
  deleteStoreProduct,
  createStoreCategory,
  getTopStoreProducts,
  deleteStoreCategory,
  getStoreProductBySlug,
  writeProductReview,
};
