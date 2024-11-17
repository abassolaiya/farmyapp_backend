import asyncHandler from "express-async-handler";
import Unavailable from "../../models/farms/unAvailableModel.js";
import { cloudinary } from "../../utils/cloudinary.js";

const markUnavailableAsFulfilled = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Unavailable.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  product.fulfilled = true;
  await product.save();

  res.json({ message: "Product marked as fulfilled" });
});

const getAllUnavailable = asyncHandler(async (req, res) => {
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

  const count = await Unavailable.countDocuments({
    ...keyword,
    fulfilled: false,
  });

  const products = await Unavailable.find({ ...keyword, fulfilled: false })
    .sort({ createdAt: -1 }) // Sort by createdAt in descending order (latest to oldest)
    // .populate({
    //   path: "userId",
    //   select: "-password", // Exclude the password field
    // })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ products, page, pages: Math.ceil(count / pageSize) });
});

const getUnavailableById = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await Unavailable.findById(productId).populate({
    path: "userId",
    select: "-password", // Exclude the password field
  });

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // const relatedProducts = await Unavailable.find({
  //   _id: { $ne: productId },
  //   $or: [
  //     { productName: { $regex: product.productName, $options: "i" } },
  //     {
  //       productDescription: {
  //         $regex: product.productDescription,
  //         $options: "i",
  //       },
  //     },
  //     {
  //       perUnitPrice: {
  //         $gte: parseFloat(product.perUnitPrice) - 100,
  //         $lte: parseFloat(product.perUnitPrice) + 100,
  //       },
  //     },
  //   ],
  // })
  //   .limit(5)
  //   .populate({
  //     path: "userId",
  //     select: "-password", // Exclude the password field
  //   });

  res.json({ product });
});

const deleteUnavailable = asyncHandler(async (req, res) => {
  const product = await Unavailable.findById(req.params.id);
  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed from DB" });
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Product not found");
  }
});

const createUnavailable = asyncHandler(async (req, res) => {
  const { user, userType } = req;
  const {
    productName,
    productDescription,
    measuringScale,
    perUnitPrice,
    date,
    quantity,
  } = req.body;

  // Parse the date string to a Date object
  const parsedDate = new Date(date);

  var images = [];

  for (var i = 0; i < req.files.length; i++) {
    var localFilePath = req.files[i].path;
    var result = await cloudinary(localFilePath);
    images.push(result.secure_url);
  }

  const product = new Unavailable({
    productName,
    productDescription,
    measuringScale,
    perUnitPrice,
    date: parsedDate, // Save the parsed Date object
    quantity,
    userType,
    userId: user._id,
    images,
    numReviews: 0,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

const updateUnavailable = asyncHandler(async (req, res) => {
  const {
    productName,
    productDescription,
    measuringScale,
    perUnitPrice,
    date,
    quantity,
  } = req.body;
  const product = await Unavailable.findById(req.params.id);

  // update the fields which are sent with the payload
  if (product) {
    if (productName) product.productName = productName;
    if (productDescription) product.productDescription = productDescription;
    if (measuringScale) product.measuringScale = measuringScale;
    if (perUnitPrice) product.perUnitPrice = perUnitPrice;
    if (date) product.date = date;
    if (quantity) product.quantity = quantity;

    // Check if new files are uploaded
    if (req.files && req.files.length > 0) {
      const images = [];

      for (let i = 0; i < req.files.length; i++) {
        const localFilePath = req.files[i].path;
        const result = await cloudinary(localFilePath);
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

export {
  markUnavailableAsFulfilled,
  getAllUnavailable,
  getUnavailableById,
  deleteUnavailable,
  createUnavailable,
  updateUnavailable,
};
