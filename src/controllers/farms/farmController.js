import asyncHandler from "express-async-handler";
import Farm from "../../models/farms/farmerModel.js";
import cloudinary from "../../utils/cloudinary.js";
import FarmProduct from "../../models/farms/farmProductModel.js";
import generateToken from "../../utils/generateFarmToken.js";
import TokenBlacklist from "../../models/tokenBlackListModel.js";
import sgMail from "@sendgrid/mail";
import { sendEmail } from "../../utils/mailing.js";

const authFarm = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const farm = await Farm.findOne({ email });

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
    const farmExists = await Farm.findOne({ email });
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
      email,
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

  const farm = await Farm.findOne({ email });

  if (!farm) {
    return res.status(400).json({ message: "farm not found." });
  }

  const verificationCode = generateVerificationCode(12);
  user.verificationCode = verificationCode;
  await farm.save();

  const mailOptions = {
    to: email,
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

// const forgotPassword = async (req, res) => {
//   const { email } = req.body;
//   sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//   try {
//     const farm = await Farm.findOne({ email });

//     if (!farm) {
//       return res.status(400).json({ message: "farm not found." });
//     }

//     const verificationCode = generateVerificationCode(12);
//     farm.verificationCode = verificationCode;
//     await farm.save();

//     const msg = {
//       to: farm.email,
//       from: "no-reply@farmyapp.com",
//       subject: "Password Reset Request",
//       html: `
//           <h1>Password Reset</h1>
//           <p>Hello ${farm.firstName},</p>
//           <p>You recently requested to reset your password. To reset your password, please enter the verification code below:</p>
//           <p>Verification Code: ${verificationCode}</p>
//           <a href="https://farmyapp.com/farm/reset-password" target="_blank">Reset Password</a>
//           <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
//           <p>Thank you,</p>
//           <p>Your FarmyApp Team</p>
//         `,
//     };

//     await sgMail.send(msg);

//     res
//       .status(200)
//       .json({ message: "Password reset email sent successfully." });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to send password reset email." });
//   }
// };

const resetPassword = async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  try {
    const farm = await Farm.findOne({ email, verificationCode });

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
};
