import asyncHandler from "express-async-handler";
import Store from "../../models/stores/sellerModel.js";
import { cloudinary } from "../../utils/cloudinary.js";
import generateToken from "../../utils/generateStorToken.js";
import slugify from "slugify";
import StoreProduct from "../../models/stores/storeProductModel.js";
import StoreCategory from "../../models/stores/storeCategories.js";
import { sendEmail } from "../../utils/mailing.js";
import TokenBlacklist from "../../models/tokenBlackListModel.js";

// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authStore = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Trim leading and trailing spaces from the email
  const trimmedEmail = email.trim();

  // Find the store with the trimmed email
  const store = await Store.findOne({ email: trimmedEmail });

  if (!store) {
    res.status(401);
    throw new Error("Store with this email does not exist");
  }

  if (!store.wallet) {
    store.wallet = {
      temporaryBalance: 0,
      finalBalance: 0,
    };
    await store.save();
  }

  const isPasswordValid = await store.matchPassword(password);

  if (store && isPasswordValid) {
    const token = generateToken(store._id);

    res.json({
      _id: store._id,
      storeName: store.storeName,
      email: store.email,
      avatar: store.avatar,
      slug: store.slug,
      token: token,
    });
  } else {
    res.status(401);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    } else {
      throw new Error("Invalid email");
    }
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public

const registerStore = asyncHandler(async (req, res) => {
  try {
    const {
      storeName,
      storeAddress,
      city,
      email,
      username,
      phoneNumber,
      password,
      referralId,
    } = req.body;

    // Trim spaces from the email
    const trimmedEmail = email.trim();

    const existingStoreEmail = await Store.findOne({ email: trimmedEmail });
    const existingStorePhone = await Store.findOne({ phoneNumber });
    const existingStoreUsername = await Store.findOne({ username });

    if (existingStoreEmail) {
      return res
        .status(400)
        .json({ error: "Store already exists with this email" });
    }

    if (existingStorePhone) {
      return res
        .status(400)
        .json({ error: "Store already exists with this phone number" });
    }

    if (existingStoreUsername) {
      return res
        .status(400)
        .json({ error: "Store already exists with this Username" });
    }

    let avatar = null;
    let coverPhoto = null;

    // Update avatar
    if (req.files && req.files.avatar) {
      const avatarResult = await cloudinary(req.files.avatar[0].path);
      avatar = avatarResult.secure_url;
    }

    // Update coverPhoto
    if (req.files && req.files.coverPhoto) {
      const coverPhotoResult = await cloudinary(req.files.coverPhoto[0].path);
      coverPhoto = coverPhotoResult.secure_url;
    }

    const slug = slugify(username, { lower: true });

    const store = await Store.create({
      storeName,
      storeAddress,
      city,
      email: trimmedEmail,
      username,
      phoneNumber,
      password,
      slug,
      avatar,
      referralId,
      coverPhoto,
    });

    if (!store) {
      return res.status(400).json({ error: "Failed to create store" });
    }

    const token = generateToken(store._id);

    res.status(201).json({
      _id: store._id,
      storeName: store.storeName,
      email: store.email,
      avatar,
      slug: store.slug,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      res.status(400).json({ error: messages.join(", ") });
    } else if (error.code === 11000) {
      res.status(400).json({ error: "Duplicate field value entered" });
    } else {
      res.status(500).json({ error: "Server error: Failed to register store" });
    }
  }
});

const addStoreLocation = asyncHandler(async (req, res) => {
  const { address, city, coordinates } = req.body;

  try {
    const store = await Store.findById(req.store._id);

    if (!store) {
      res.status(404);
      throw new Error("Store not found");
    }

    // Create a new location object
    const location = {
      address,
      city,
      coordinates: {
        type: "Point",
        coordinates: coordinates,
      },
    };

    store.storeLocations.push(location);

    // Save the updated store
    await store.save();

    res.status(201).json({
      message: "Store location added successfully",
      location,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const editStoreLocation = asyncHandler(async (req, res) => {
  const locationId = req.params.locationId;
  const { address, city, coordinates, closed } = req.body;

  try {
    const store = await Store.findById(req.store._id);

    if (!store) {
      res.status(404);
      throw new Error("Store not found");
    }

    // Find the location you want to edit
    const location = store.storeLocations.id(locationId);

    if (!location) {
      res.status(404);
      throw new Error("Location not found");
    }

    // Update the location properties
    location.address = address;
    location.city = city;
    location.coordinates = {
      type: "Point",
      coordinates: coordinates,
    };
    location.closed = closed !== undefined ? closed : location.closed;

    // Save the updated store
    await store.save();

    res.status(200).json({
      message: "Store location updated successfully",
      location,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const getStoreLocation = asyncHandler(async (req, res) => {
  const locationId = req.params.locationId;
  try {
    const store = await Store.findOne(
      { "storeLocations._id": locationId },
      { "storeLocations.$": 1 }
    );

    if (!store || !store.storeLocations.length) {
      res.status(404);
      throw new Error("Location not found");
    }

    const location = store.storeLocations[0];
    res.status(200).json(location);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const deleteStoreLocation = asyncHandler(async (req, res) => {
  const locationId = req.params.locationId;

  try {
    const store = await Store.findById(req.store._id);

    if (!store) {
      res.status(404);
      throw new Error("Store not found");
    }

    store.storeLocations.pull({ _id: locationId }); // Use pull with object matching

    await store.save();

    res.status(200).json({ message: "Store location deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const logoutStore = async (req, res) => {
  if (res.cookie) {
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: new Date(0),
    });
  }

  const token = req.headers.authorization.split(" ")[1];

  try {
    const isTokenBlacklisted = await TokenBlacklist.findOne({ token });

    if (!isTokenBlacklisted) {
      await TokenBlacklist.create({ token });
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getStoreProfile = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.store._id);
  const products = await StoreProduct.find({ userId: req.store._id });
  const categories = await StoreCategory.find({ userId: req.store._id });

  if (store) {
    res.json({
      _id: store._id,
      storeName: store.storeName,
      storeAddress: store.storeAddress,
      city: store.city,
      email: store.email,
      username: store.username,
      phoneNumber: store.phoneNumber,
      avatar: store.avatar,
      coverPhoto: store.coverPhoto,
      slug: store.slug,
      storeLocations: store.storeLocations,
      products,
      categories,
      wallet: store.wallet,
      bankCode: store.bankCode,
      storeHours: store.storeHours,
      closed: store.closed,
    });
  } else {
    res.status(404);
    throw new Error("Store not found");
  }
});

const getStores = asyncHandler(async (req, res) => {
  const { latitude, longitude, distance, searchTerm } = req.query;
  const maxDistance = distance || 5000000;
  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and longitude are required parameters.",
    });
  }

  const userLocation = [parseFloat(longitude), parseFloat(latitude)];
  const currentDate = new Date();
  const currentDay = currentDate.toLocaleString("en-US", { weekday: "long" });
  const currentTime = currentDate.toTimeString().split(" ")[0]; // HH:MM:SS

  const matchCriteria = { closed: false };
  if (searchTerm) {
    matchCriteria.$or = [
      { storeName: { $regex: new RegExp(searchTerm, "i") } },
      { _id: searchTerm },
      { slug: searchTerm },
    ];
  }

  try {
    const stores = await Store.aggregate([
      {
        $match: matchCriteria,
      },
      {
        $unwind: "$storeLocations",
      },
      {
        $match: {
          "storeLocations.closed": false,
        },
      },
      {
        $unwind: "$storeHours",
      },
      {
        $match: {
          "storeHours.day": currentDay,
          "storeHours.openingTime": { $lte: currentTime },
          "storeHours.closingTime": { $gte: currentTime },
        },
      },
      {
        $addFields: {
          "storeLocations.distanceMeters": {
            $let: {
              vars: {
                lat1: {
                  $arrayElemAt: ["$storeLocations.coordinates.coordinates", 1],
                },
                lon1: {
                  $arrayElemAt: ["$storeLocations.coordinates.coordinates", 0],
                },
                lat2: userLocation[1],
                lon2: userLocation[0],
              },
              in: {
                $multiply: [
                  6371000, // Earth radius in meters
                  {
                    $acos: {
                      $max: [
                        -1,
                        {
                          $min: [
                            1,
                            {
                              $add: [
                                {
                                  $multiply: [
                                    { $sin: { $degreesToRadians: "$$lat1" } },
                                    { $sin: { $degreesToRadians: "$$lat2" } },
                                  ],
                                },
                                {
                                  $multiply: [
                                    { $cos: { $degreesToRadians: "$$lat1" } },
                                    { $cos: { $degreesToRadians: "$$lat2" } },
                                    {
                                      $cos: {
                                        $degreesToRadians: {
                                          $subtract: ["$$lon1", "$$lon2"],
                                        },
                                      },
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          "storeLocations.distanceMeters": { $lte: maxDistance },
        },
      },
      {
        $project: {
          password: 0,
          storeAddress: 0,
          email: 0,
          phoneNumber: 0,
          city: 0,
        },
      },
      {
        $sort: {
          "storeLocations.distanceMeters": 1,
        },
      },
    ]);

    if (stores.length === 0) {
      return res.status(404).json({
        message: "No stores found within the specified distance.",
      });
    }
    res.json({ stores });
  } catch (error) {
    console.error("Error fetching stores:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const getStoreProfileBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug;

  try {
    const store = await Store.findOne({ slug });
    const products = await StoreProduct.find({ userId: store._id });
    const categories = await StoreCategory.find({ userId: store._id });

    if (store) {
      res.json({
        _id: store._id,
        storeName: store.storeName,
        storeAddress: store.storeAddress,
        city: store.city,
        email: store.email,
        username: store.username,
        phoneNumber: store.phoneNumber,
        avatar: store.avatar,
        coverPhoto: store.coverPhoto,
        slug: store.slug,
        storeLocations: store.storeLocations,
        products,
        categories,
      });
    } else {
      res.status(404);
      throw new Error("Store not found");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updateStoreProfile = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.store._id);

  if (store) {
    if (req.body.storeName) {
      store.storeName = req.body.storeName;
    }
    if (req.body.storeAddress) {
      store.storeAddress = req.body.storeAddress;
    }
    if (req.body.city) {
      store.city = req.body.city;
    }
    if (req.body.username) {
      store.username = req.body.username;
    }
    if (req.body.phoneNumber) {
      store.phoneNumber = req.body.phoneNumber;
    }
    if (req.file) {
      store.avatar = req.file.path;
    }
    if (req.body.storeHours) {
      store.storeHours = JSON.parse(req.body.storeHours);
    }
    console.log(store);

    const updatedStore = await store.save();
    res.json(updatedStore);
    console.log("got here");
  } else {
    res.status(404);
    throw new Error("Store not found");
  }
});

const addBankDetails = asyncHandler(async (req, res) => {
  const { bankCode, bankName, accountNumber, accountName } = req.body;
  const store = await Store.findById(req.store._id);

  if (store) {
    store.bankCode = bankCode || store.bankCode;
    store.bankName = bankName || store.bankName;
    store.accountName = accountName || store.accountName;
    store.accountNumber = accountNumber || store.accountNumber;

    // Logic to generate recipient code and assign it to the user
    // try {
    //   if (bankCode && accountNumber) {
    //     store.recipientCode = await generateRecipientCode(accountNumber, bankCode);
    //   }
    // } catch (error) {
    //   res.status(500).json({ message: 'Error generating recipient code' });
    //   return;
    // }
    // console.log(store);

    const updatedStore = await store.save();

    res.json({
      _id: updatedStore._id,
      storeName: updatedStore.storeName,
      bankCode: updatedStore.bankCode,
      bankName: updatedStore.bankName,
      accountName: updatedStore.accountName,
      accountNumber: updatedStore.accountNumber,
      recipientCode: updatedStore.recipientCode,
    });
  } else {
    res.status(404);
    throw new Error("Store not found");
  }
});

const editPassword = async (req, res) => {
  const storeId = req.store._id;
  const { currentPassword, newPassword } = req.body;

  try {
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ message: "Store not found." });
    }

    const passwordMatch = await store.matchPassword(currentPassword);

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    store.password = newPassword;

    await store.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update password" });
  }
};

function generateVerificationCode(length) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    code += charset[randomIndex];
  }
  return code;
}

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Trim leading and trailing spaces from the email
  const trimmedEmail = email.trim();

  const store = await Store.findOne({ email: trimmedEmail });
  // console.log(store)
  if (!store) {
    res.status(404).json({ error: "Store not found" });
    return;
  }

  const verificationCode = generateVerificationCode(12);
  store.verificationCode = verificationCode;
  await store.save();

  const mailOptions = {
    to: trimmedEmail,
    from: "no-reply@farmyapp.com",
    subject: "Password Reset Request",
    text: `
        <h1>Password Reset</h1>
        <p>Hello ${store.username},</p>
        <p>You recently requested to reset your password. To reset your password, please enter the verification code below:</p>
        <p>Verification Code: ${verificationCode}</p>
        <p>This code expires in 3 hours.</p>
        <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>Thank you,</p>
        <p>Your FarmyApp Team</p>
      `,
  };
  // Assuming you have a function to send emails
  await sendEmail(mailOptions);

  res.json({ message: "Password reset code sent to your email" });
});

const resetPassword = async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  // Trim leading and trailing spaces from the email
  const trimmedEmail = email.trim();

  try {
    const store = await Store.findOne({
      email: trimmedEmail,
      verificationCode,
    });

    if (!store) {
      return res
        .status(400)
        .json({ message: "Invalid email or verification code." });
    }

    store.password = newPassword;
    store.verificationCode = undefined;
    await store.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Password reset failed." });
  }
};

const deleteStoreAccount = asyncHandler(async (req, res) => {
  const storeId = req.store._id;

  try {
    const { email, password } = req.body;

    const store = await Store.findOne({ email });

    if (!store) {
      res.status(404);
      throw new Error("User not found");
    }

    if (!(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    store.deleted = true;
    store.deletedAt = Date.now();
    await store.save();

    // Send an email with a link to recover the account within 30 days
    const recoverLink = `https://farmyapp.com/recover-account`;
    const mailOptions = {
      to: email,
      from: "no-reply@farmyapp.com",
      subject: "Account Deletion Confirmation",
      text: `
      <h1>Account Deletion Confirmation</h1>
      <p>Hello ${store.username},</p>
      <p>Your account has been deleted. If you want to recover your account, please click on the link below within 30 days:</p>
      <p>${recoverLink}</p>
      <p>If you did not request account deletion, please click the recovery link as someone must have deleted your account or Your account will remain deleted.</p>
      <p>Thank you,</p>
      <p>Your FarmyApp Team</p>
    `,
    };
    await sendEmail(mailOptions);

    res.status(200).json({ message: "Store account deleted successfully" });
  } catch (error) {
    console.error("Error deleting store account:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const recoverStoreAccount = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const store = await Store.findOne({ email, isDeleted: true });

  if (store && (await store.matchPassword(password))) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (store.deletedAt > thirtyDaysAgo) {
      store.isDeleted = false;
      store.deletedAt = null;
      await store.save();

      res.status(200).json({ message: "Account recovered successfully." });
    } else {
      res.status(400).json({ message: "Recovery period has expired." });
    }
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
});

const closeStore = asyncHandler(async (req, res) => {
  const storeId = req.params.id;
  try {
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    store.closed = true;
    await store.save();
    res.status(200).json({ message: "Store closed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const closeStoreLocation = asyncHandler(async (req, res) => {
  const storeId = req.params.storeId;
  const locationId = req.params.locationId;
  try {
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    const location = store.storeLocations.id(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    location.closed = true;
    await store.save();
    res.status(200).json({ message: "Store location closed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export {
  authStore,
  registerStore,
  logoutStore,
  getStoreProfile,
  updateStoreProfile,
  getStores,
  addStoreLocation,
  deleteStoreLocation,
  editStoreLocation,
  getStoreProfileBySlug,
  editPassword,
  forgotPassword,
  resetPassword,
  addBankDetails,
  deleteStoreAccount,
  recoverStoreAccount,
  closeStore,
  closeStoreLocation,
  getStoreLocation,
};
