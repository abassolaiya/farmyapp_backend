import asyncHandler from "express-async-handler";
import Farm from "../../models/farms/farmerModel.js";
import { cloudinary } from "../../utils/cloudinary.js";
import FarmProduct from "../../models/farms/farmProductModel.js";
import generateToken from "../../utils/generateFarmToken.js";
import TokenBlacklist from "../../models/tokenBlackListModel.js";
import sgMail from "@sendgrid/mail";
import { sendEmail } from "../../utils/mailing.js";
import Transaction from "../../models/transactionModel.js";
import Cart from "../../models/farms/FarmCartModel.js";
import FarmOrder from "../../models/farms/farmOrderModel.js";

const getAdminFarmProfile = asyncHandler(async (req, res) => {
  const farmId = req.params.id; // Assuming you get the farm ID from the request parameters
  const farm = await Farm.findById(farmId);

  if (!farm) {
    res.status(404);
    throw new Error("Farm not found");
  }

  const products = await FarmProduct.find({ userId: farmId });
  const transactions = await Transaction.find({ farmId });
  const cart = await Cart.findOne({ user: farmId });
  const orders = await FarmOrder.find({ user: farmId });

  res.json({
    _id: farm._id,
    farmName: farm.farmName,
    email: farm.email,
    avatar: farm.avatar,
    coverPhoto: farm.coverPhoto,
    username: farm.username,
    city: farm.city,
    products,
    wallet: farm.wallet,
    bankCode: farm.bankCode,
    transactions,
    cart,
    orders,
  });
});

const authFarm = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Trim leading and trailing spaces from the email
  const trimmedEmail = email.trim();

  const farm = await Farm.findOne({ email: trimmedEmail });

  if (!farm.wallet) {
    farm.wallet = {
      temporaryBalance: 0,
      finalBalance: 0,
    };

    await farm.save();
  }

  if (farm && (await farm.matchPassword(password))) {
    const token = generateToken(farm._id);

    res.json({
      _id: farm._id,
      farmName: farm.name,
      email: farm.email,
      farmName: farm.farmName,
      username: farm.username,
      avatar: farm.avatar,
      coverPhoto: farm.coverPhoto,
      city: farm.city,
      token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Register a new farm
// @route   POST /api/farm
// @access  Public
const registerFarm = asyncHandler(async (req, res) => {
  const {
    farmName,
    farmAddress,
    city,
    email,
    username,
    phoneNumber,
    password,
    referralId,
  } = req.body;

  try {
    // Trim spaces from the email
    const trimmedEmail = email.trim();

    const farmExists = await Farm.findOne({ email: trimmedEmail });
    const existingFarmPhone = await Farm.findOne({ phoneNumber });
    const existingFarmUsername = await Farm.findOne({ username });

    if (farmExists) {
      return res
        .status(400)
        .json({ error: "Farm name or email already exists" });
    }

    if (existingFarmPhone) {
      return res
        .status(400)
        .json({ error: "Farm already exists with this phone number" });
    }

    if (existingFarmUsername) {
      return res
        .status(400)
        .json({ error: "Farm already exists with this Username" });
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

    const farm = await new Farm({
      avatar,
      coverPhoto,
      farmName,
      farmAddress,
      city,
      email: trimmedEmail,
      username,
      phoneNumber,
      password,
      referralId,
    }).save();

    if (farm) {
      const token = generateToken(farm._id);

      return res.status(201).json({
        _id: farm._id,
        farmName: farm.farmName,
        email: farm.email,
        avatar: farm.avatar,
        coverPhoto: farm.coverPhoto,
        phoneNumber: farm.phoneNumber,
        username: farm.username,
        city: farm.city,
        token,
      });
    } else {
      return res.status(400).json({ error: "Invalid Farm data" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error: Failed to register farm" });
  }
});

const logoutFarm = async (req, res) => {
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

const AdminGetAllFarms = asyncHandler(async (req, res) => {
  try {
    const farms = await Farm.find({})
      .sort({ createdAt: -1 })
      .select("-password");

    res.status(200).json(farms);
  } catch (error) {
    console.error("Error fetching farms:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getFarmProfile = asyncHandler(async (req, res) => {
  const farm = await Farm.findById(req.farm._id);
  const products = await FarmProduct.find({ userId: req.farm._id });

  if (farm) {
    res.json({
      _id: farm._id,
      farmName: farm.farmName,
      email: farm.email,
      avatar: farm.avatar,
      coverPhoto: farm.coverPhoto,
      username: farm.username,
      city: farm.city,
      products,
      wallet: farm.wallet,
      bankCode: farm.bankCode,
    });
  } else {
    res.status(404);
    throw new Error("Farm not found");
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateFarmProfile = asyncHandler(async (req, res) => {
  const farm = await Farm.findById(req.farm._id);

  if (farm) {
    if (req.body.farmName) {
      farm.farmName = req.body.farmName;
    }
    if (req.body.farmAddress) {
      farm.farmAddress = req.body.farmAddress;
    }
    if (req.body.city) {
      farm.city = req.body.city;
    }
    if (req.body.email) {
      farm.email = req.body.email;
    }
    if (req.body.username) {
      farm.username = req.body.username;
    }
    if (req.body.phoneNumber) {
      farm.phoneNumber = req.body.phoneNumber;
    }
    // Update avatar
    if (req.files && req.files.avatar) {
      const avatarResult = await cloudinary(req.files.avatar[0].path);
      farm.avatar = avatarResult.secure_url;
    }

    // Update coverPhoto
    if (req.files && req.files.coverPhoto) {
      const coverPhotoResult = await cloudinary(req.files.coverPhoto[0].path);
      farm.coverPhoto = coverPhotoResult.secure_url;
    }

    const updatedFarmer = await farm.save();

    res.json({
      _id: updatedFarmer._id,
      farmName: updatedFarmer.farmName,
      email: updatedFarmer.email,
      avatar: updatedFarmer.avatar,
      coverPhoto: updatedFarmer.coverPhoto,
      phoneNumber: updatedFarmer.phoneNumber,
      username: updatedFarmer.username,
      city: farm.city,
    });
  } else {
    res.status(404);
    throw new Error("Farm not found");
  }
});

const editPassword = async (req, res) => {
  // const farm = await Farm.findById(req.farm._id);
  const farmId = req.farm._id;
  const { currentPassword, newPassword } = req.body;

  try {
    const farm = await Farm.findById(farmId);

    if (!farm) {
      return res.status(404).json({ message: "Farmer not found." });
    }

    const passwordMatch = await farm.matchPassword(currentPassword);

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    farm.password = newPassword;

    await farm.save();

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

  const farm = await Farm.findOne({ email: trimmedEmail });

  if (!farm) {
    return res.status(400).json({ message: "Farm not found." });
  }

  const verificationCode = generateVerificationCode(12);
  farm.verificationCode = verificationCode;
  await farm.save();

  const mailOptions = {
    to: trimmedEmail,
    from: "no-reply@farmyapp.com",
    subject: "Password Reset Request",
    text: `
        <h1>Password Reset</h1>
        <p>Hello ${farm.username},</p>
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
    const farm = await Farm.findOne({ email: trimmedEmail, verificationCode });

    if (!farm) {
      return res
        .status(400)
        .json({ message: "Invalid email or verification code." });
    }

    farm.password = newPassword;
    farm.verificationCode = undefined;
    await farm.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Password reset failed." });
  }
};

const addBankDetails = asyncHandler(async (req, res) => {
  const { bankCode, bankName, accountNumber, accountName } = req.body;
  const farm = await Farm.findById(req.user._id);
  if (farm) {
    farm.bankCode = bankCode || farm.bankCode;
    farm.accountName = accountName || farm.accountName;
    farm.bankName = bankName || farm.bankName;
    farm.accountNumber = accountNumber || farm.accountNumber;

    const updatedFarm = await farm.save();

    res.json({
      _id: updatedFarm._id,
      farmName: updatedFarm.farmName,
      bankCode: updatedFarm.bankCode,
      bankName: updatedFarm.bankName,
      accountName: updatedFarm.accountName,
      accountNumber: updatedFarm.accountNumber,
      recipientCode: updatedFarm.recipientCode,
    });
  } else {
    res.status(404);
    throw new Error("Farm not found");
  }
});

const deleteFarmAccount = asyncHandler(async (req, res) => {
  const farmId = req.farm._id;

  try {
    const { email, password } = req.body;

    const farm = await Farm.findOne({ email });

    if (!farm) {
      res.status(404);
      throw new Error("User not found");
    }

    if (!(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    farm.deleted = true;
    farm.deletedAt = Date.now();
    await farm.save();

    // Send an email with a link to recover the account within 30 days
    const recoverLink = `https://farmyapp.com/recover-account`;
    const mailOptions = {
      to: email,
      from: "no-reply@farmyapp.com",
      subject: "Account Deletion Confirmation",
      text: `
      <h1>Account Deletion Confirmation</h1>
      <p>Hello ${farm.username},</p>
      <p>Your account has been deleted. If you want to recover your account, please click on the link below within 30 days:</p>
      <p>${recoverLink}</p>
      <p>If you did not request account deletion, please click the recovery link as someone must have deleted your account or Your account will remain deleted.</p>
      <p>Thank you,</p>
      <p>Your FarmyApp Team</p>
    `,
    };
    await sendEmail(mailOptions);

    res.status(200).json({ message: "Farm account deleted successfully" });
  } catch (error) {
    console.error("Error deleting farm account:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const recoverFarmAccount = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const farm = await Farm.findOne({ email, isDeleted: true });

  if (farm && (await farm.matchPassword(password))) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (farm.deletedAt > thirtyDaysAgo) {
      farm.isDeleted = false;
      farm.deletedAt = null;
      await farm.save();

      res.status(200).json({ message: "Account recovered successfully." });
    } else {
      res.status(400).json({ message: "Recovery period has expired." });
    }
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
});

export {
  authFarm,
  registerFarm,
  logoutFarm,
  getFarmProfile,
  updateFarmProfile,
  editPassword,
  forgotPassword,
  resetPassword,
  addBankDetails,
  deleteFarmAccount,
  recoverFarmAccount,
  AdminGetAllFarms,
  getAdminFarmProfile,
};
