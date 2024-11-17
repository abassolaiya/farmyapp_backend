import asyncHandler from "express-async-handler";
import User from "../../models/buyer/userModel.js";
import generateToken from "../../utils/generateUserToken.js";
import { cloudinary } from "../../utils/cloudinary.js";
import TokenBlacklist from "../../models/tokenBlackListModel.js";
import { sendEmail } from "../../utils/mailing.js";

import sgMail from "@sendgrid/mail";

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user.wallet) {
    user.wallet = {
      temporaryBalance: 0,
      finalBalance: 0,
    };

    await user.save();
  }

  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      phoneNumber: user.phoneNumber,
      token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  try {
    const { name, username, phoneNumber, email, password, referralId } =
      req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }, { username }],
    });

    if (existingUser) {
      let errorMessage = "This ";

      if (existingUser.email === email) {
        errorMessage += "email";
      } else if (existingUser.username === username) {
        errorMessage += "Username";
      } else {
        errorMessage += "phone number";
      }

      errorMessage += " is already in use. Please use a different one.";

      return res.status(400).json({ error: errorMessage });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    let avatar;
    let coverPhoto;
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

    const newUser = await User.create({
      name,
      username,
      phoneNumber,
      email,
      password,
      referralId,
      avatar,
      coverPhoto,
    });

    if (!newUser) {
      return res.status(400).json({ error: "Failed to create user" });
    }

    const token = generateToken(newUser._id);

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      coverPhoto: newUser.coverPhoto,
      phoneNumber: newUser.phoneNumber,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error: Failed to register user" });
  }
});

const logoutUser = async (req, res) => {
  if (res.cookie) {
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    res.status(200).json({ message: "Logged out successfully" });
  } else {
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
  }
};

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      username: user.username,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      wallet: user.wallet,
      bankCode: user.bankCode,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    if (req.body.name) {
      user.name = req.body.name;
    }
    if (req.body.email) {
      user.email = req.body.email;
    }
    if (req.body.phoneNumber) {
      user.phoneNumber = req.body.phoneNumber;
    }
    if (req.body.username) {
      user.username = req.body.username;
    }
    // Update avatar
    if (req.files && req.files.avatar) {
      const avatarResult = await cloudinary(req.files.avatar[0].path);
      user.avatar = avatarResult.secure_url;
    }

    // Update coverPhoto
    if (req.files && req.files.coverPhoto) {
      const coverPhotoResult = await cloudinary(req.files.coverPhoto[0].path);
      user.coverPhoto = coverPhotoResult.secure_url;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      phoneNumber: user.phoneNumber,
      avatar: updatedUser.avatar,
      coverPhoto: updatedUser.coverPhoto,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const editPassword = async (req, res) => {
  const userId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordMatch = await user.matchPassword(currentPassword);

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    user.password = newPassword;

    await user.save();

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

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const verificationCode = generateVerificationCode(12);
  user.verificationCode = verificationCode;
  await user.save();

  const mailOptions = {
    to: email,
    from: "no-reply@farmyapp.com",
    subject: "Password Reset Request",
    text: `
        <h1>Password Reset</h1>
        <p>Hello ${user.username},</p>
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

  try {
    const user = await User.findOne({ email, verificationCode });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid email or verification code." });
    }

    user.password = newPassword;
    user.verificationCode = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Password reset failed." });
  }
};

const addBankDetails = asyncHandler(async (req, res) => {
  const { bankCode, bankName, accountNumber, accountName } = req.body;
  const user = await User.findById(req.store._id);

  if (user) {
    user.bankCode = bankCode || user.bankCode;
    user.accountName = accountName || user.accountName;
    user.bankName = bankName || user.bankName;
    user.accountNumber = accountNumber || user.accountNumber;

    // try {
    //   if (bankCode && accountNumber) {
    //     user.recipientCode = await generateRecipientCode(
    //       accountNumber,
    //       bankCode
    //     );
    //   }
    // } catch (error) {
    //   res.status(500).json({ message: "Error generating recipient code" });
    //   return;
    // }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      userName: updatedUser.userName,
      bankCode: updatedUser.bankCode,
      bankName: updatedUser.bankName,
      accountName: updatedUser.accountName,
      accountNumber: updatedUser.accountNumber,
      recipientCode: updatedUser.recipientCode,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const deleteAccount = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  // Soft delete the user account
  user.isDeleted = true;
  user.deletedAt = Date.now();
  await user.save();

  // Send an email with a link to recover the account within 30 days
  const recoverLink = `https://farmyapp.com/recover-account`;
  const mailOptions = {
    to: email,
    from: "no-reply@farmyapp.com",
    subject: "Account Deletion Confirmation",
    text: `
      <h1>Account Deletion Confirmation</h1>
      <p>Hello ${user.username},</p>
      <p>Your account has been deleted. If you want to recover your account, please click on the link below within 30 days:</p>
      <p>${recoverLink}</p>
      <p>If you did not request account deletion, please ignore this email. Your account will remain deleted.</p>
      <p>Thank you,</p>
      <p>Your FarmyApp Team</p>
    `,
  };
  await sendEmail(mailOptions);

  res.status(200).json({
    message:
      "Account marked for deletion. You have 30 days to recover your account.",
  });
});

const recoverAccount = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, isDeleted: true });

  if (user && (await user.matchPassword(password))) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (user.deletedAt > thirtyDaysAgo) {
      user.isDeleted = false;
      user.deletedAt = null;
      await user.save();

      res.status(200).json({ message: "Account recovered successfully." });
    } else {
      res.status(400).json({ message: "Recovery period has expired." });
    }
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
});

export {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  editPassword,
  forgotPassword,
  resetPassword,
  addBankDetails,
  deleteAccount,
  recoverAccount,
};
