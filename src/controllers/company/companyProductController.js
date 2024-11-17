import asyncHandler from "express-async-handler";

import CompanyCategory from "../../models/company/companyCategory.js";
import CompanyProduct from "../../models/company/companyProductModel.js";
import { cloudinary } from "../../utils/cloudinary.js";
import Company from "../../models/company/company.js";
import slugify from "slugify";

const getAverageRating = (reviews) => {
  if (reviews.length === 0) return 0;

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
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
  const count = await CompanyProduct.countDocuments({ ...keyword });

  const products = await CompanyProduct.find({ ...keyword })
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

const getCompanyProductsByUserId = asyncHandler(async (req, res) => {
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

  const count = await CompanyProduct.countDocuments({ ...keyword });

  const products = await CompanyProduct.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ products, page, pages: Math.ceil(count / pageSize) });
});

const getCompanyProductsBySlug = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const companySlug = req.params.companySlug;

  const company = await Company.findOne({ slug: companySlug });

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const userId = company._id; // Assuming the userId field exists in the Company model
  const categories = await CompanyCategory.find({ userId });

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

  const count = await CompanyProduct.countDocuments({ ...keyword });

  const products = await CompanyProduct.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    companyName: company.companyName,
    companyAddress: company.companyAddress,
    city: company.city,
    username: company.username,
    avatar: company.avatar,
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
  const count = await CompanyCategory.countDocuments({ ...keyword });

  const categories = await CompanyCategory.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ categories, page, pages: Math.ceil(count / pageSize) });
});

const getCompanyCategories = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const companySlug = req.params.companySlug;

  const company = await Company.findOne({ slug: companySlug });

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const userId = company._id;

  const keyword = req.query.keyword
    ? {
        userId: userId,
        category: {
          $regex: req.query.keyword,
          $options: "si",
        },
      }
    : { userId: userId };

  const count = await CompanyCategory.countDocuments({ ...keyword });

  const categories = await CompanyCategory.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ categories, page, pages: Math.ceil(count / pageSize) });
});

const getCompanyCategoryById = asyncHandler(async (req, res) => {
  // console.log("it got here");
  const category = await CompanyCategory.findById(req.params.id);
  const products = await CompanyProduct.find({ category: req.params._id });
  if (category) {
    // Send both category and products as an object
    res.json({ category, products });
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Category not found");
  }
});

const getCompanyProductById = asyncHandler(async (req, res) => {
  const product = await CompanyProduct.find({
    userId: req.company._id,
    _id: req.params.id,
  });
  console.log(product);
  if (product) res.json(product);
  else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Product not found");
  }
});

const getCompanyProductBySlug = asyncHandler(async (req, res) => {
  const companySlug = req.params.companySlug;
  const productSlug = req.params.slug;

  const company = await Company.findOne({ slug: companySlug });

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const userId = company._id;

  const product = await CompanyProduct.findOne({ userId, slug: productSlug });

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const relatedProducts = await CompanyProduct.find({
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

  const companySlug = req.params.companySlug;
  const productSlug = req.params.slug;

  const company = await Company.findOne({ slug: companySlug });

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const product = await CompanyProduct.findOne({
    userId: company._id,
    slug: productSlug,
  });

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // const existingReview = product.reviews.find(
  //   (review) => review.user.toString() === userId.toString()
  // );

  // if (existingReview) {
  //   res.status(400).json({ error: "You have already reviewed this product" });
  //   return;
  // }

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

  const products = await CompanyProduct.find({ userId: company._id });
  const companyRating = getAverageRating(
    products.reduce((acc, product) => acc.concat(product.reviews), [])
  );

  company.rating = companyRating;

  await company.save();

  res.status(201).json({ message: "Review submitted successfully" });
});

const deleteCompanyProduct = asyncHandler(async (req, res) => {
  const product = await CompanyProduct.findById(req.params.id);

  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed from DB" });
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Product not found");
  }
});

const deleteCompanyCategory = asyncHandler(async (req, res) => {
  const category = await CompanyCategory.findById(req.params.id);
  if (category) {
    await category.deleteOne();
    res.json({ message: "Category removed from DB" });
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Category not found");
  }
});

const createCompanyProduct = asyncHandler(async (req, res) => {
  const {
    productName,
    productDescription,
    measuringScale,
    commission,
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

  const product = new CompanyProduct({
    productName,
    productDescription,
    commission,
    inStock,
    price,
    category,
    measuringScale,
    userId: req.company._id,
    images,
    slug,
    numReviews: 0,
  });
  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

const createCompanyCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  // console.log(name);
  const slug = slugify(name, { lower: true });

  const category = new CompanyCategory({
    name,
    userId: req.company._id,
    slug,
  });
  const createdCategory = await category.save();
  res.status(201).json(createdCategory);
});

const updateCompanyProduct = asyncHandler(async (req, res) => {
  const {
    productName,
    productDescription,
    commission,
    inStock,
    price,
    category,
    measuringScale,
  } = req.body;
  const product = await CompanyProduct.findById(req.params.id);
  var images = [];

  if (product) {
    if (productName) product.productName = productName;
    if (productName) product.slug = slugify(productName, { lower: true });
    if (productDescription) product.productDescription = productDescription;
    if (measuringScale) product.measuringScale = measuringScale;
    if (price) product.price = price;
    if (commission) product.commission = commission;
    if (category) product.category = category;
    if (inStock) product.inStock = inStock;

    // Check if new images are provided
    if (req.files && req.files.length > 0) {
      // New images uploaded
      for (var i = 0; i < req.files.length; i++) {
        var localFilePath = req.files[i].path;
        var result = await cloudinary(localFilePath);
        images.push(result.secure_url);
      }
      // Set product images to the new images
      product.images = images;
    }

    const updatedProduct = await product.save();
    if (updatedProduct) res.status(201).json(updatedProduct);
  } else {
    res.status(404);
    throw new Error("Product not available");
  }
});

const getTopCompanyProducts = asyncHandler(async (req, res) => {
  // get top 4 rated products
  const topProducts = await CompanyProduct.find({})
    .sort({ rating: -1 })
    .limit(4);
  res.json(topProducts);
});

export {
  getAllCategories,
  getAllProducts,
  getCompanyCategories,
  getCompanyCategoryById,
  getCompanyProductById,
  getCompanyProductsBySlug,
  getCompanyProductsByUserId,
  updateCompanyProduct,
  createCompanyProduct,
  deleteCompanyProduct,
  createCompanyCategory,
  getTopCompanyProducts,
  deleteCompanyCategory,
  getCompanyProductBySlug,
  writeProductReview,
};
