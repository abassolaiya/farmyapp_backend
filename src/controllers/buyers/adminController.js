import asyncHandler from "express-async-handler";
import Admin from "../../models/buyer/adminModel.js";
import generateToken from "../../utils/generateUserToken.js";
import { cloudinary } from "../../utils/cloudinary.js";
import TokenBlacklist from "../../models/tokenBlackListModel.js";
import { sendEmail } from "../../utils/mailing.js";

import sgMail from "@sendgrid/mail";
const authAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!admin.wallet) {
    admin.wallet = {
      temporaryBalance: 0,
      finalBalance: 0,
    };

    await admin.save();
  }

  if (await admin.matchPassword(password)) {
    const token = generateToken(admin._id);

    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      avatar: admin.avatar,
      coverPhoto: admin.coverPhoto,
      phoneNumber: admin.phoneNumber,
      wallet: admin.wallet,
      token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

const registerAdmin = asyncHandler(async (req, res) => {
  try {
    const { name, username, phoneNumber, email, password, referralId } =
      req.body;

    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { phoneNumber }, { username }],
    });

    if (existingAdmin) {
      let errorMessage = "This ";

      if (existingAdmin.email === email) {
        errorMessage += "email";
      } else if (existingAdmin.username === username) {
        errorMessage += "Username";
      } else {
        errorMessage += "phone number";
      }

      errorMessage += " is already in use. Please use a different one.";

      return res.status(400).json({ error: errorMessage });
    }

    let avatar;
    let coverPhoto;

    if (req.files && req.files.avatar) {
      const avatarResult = await cloudinary(req.files.avatar[0].path);
      avatar = avatarResult.secure_url;
    }

    // Update coverPhoto
    if (req.files && req.files.coverPhoto) {
      const coverPhotoResult = await cloudinary(req.files.coverPhoto[0].path);
      coverPhoto = coverPhotoResult.secure_url;
    }

    const newAdmin = await Admin.create({
      name,
      username,
      phoneNumber,
      email,
      password,
      referralId,
      avatar,
      coverPhoto,
    });

    if (!newAdmin) {
      return res.status(400).json({ error: "Failed to create admin" });
    }

    const token = generateToken(newAdmin._id);

    res.status(201).json({
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      avatar: newAdmin.avatar,
      coverPhoto: newAdmin.coverPhoto,
      phoneNumber: newAdmin.phoneNumber,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error: Failed to register admin" });
  }
});

const logoutAdmin = async (req, res) => {
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

const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);

  if (admin) {
    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      phoneNumber: admin.phoneNumber,
      username: admin.username,
      avatar: admin.avatar,
      coverPhoto: admin.coverPhoto,
      wallet: admin.wallet,
      bankCode: admin.bankCode,
    });
  } else {
    res.status(404);
    throw new Error("Admin not found");
  }
});

const updateAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);

  if (admin) {
    if (req.body.name) {
      admin.name = req.body.name;
    }
    if (req.body.email) {
      admin.email = req.body.email;
    }
    if (req.body.phoneNumber) {
      admin.phoneNumber = req.body.phoneNumber;
    }
    if (req.body.username) {
      admin.username = req.body.username;
    }

    if (req.files && req.files.avatar) {
      const avatarResult = await cloudinary(req.files.avatar[0].path);
      admin.avatar = avatarResult.secure_url;
    }

    if (req.files && req.files.coverPhoto) {
      const coverPhotoResult = await cloudinary(req.files.coverPhoto[0].path);
      admin.coverPhoto = coverPhotoResult.secure_url;
    }
    const updatedAdmin = await admin.save();

    res.json({
      _id: updatedAdmin._id,
      name: updatedAdmin.name,
      username: updatedAdmin.username,
      email: updatedAdmin.email,
      phoneNumber: updatedAdmin.phoneNumber,
      avatar: updatedAdmin.avatar,
      coverPhoto: updatedAdmin.coverPhoto,
    });
  } else {
    res.status(404);
    throw new Error("Admin not found");
  }
});

const resetAdminPassword = async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  try {
    const admin = await Admin.findOne({ email, verificationCode });

    if (!admin) {
      return res
        .status(400)
        .json({ message: "Invalid email or verification code." });
    }

    admin.password = newPassword;
    admin.verificationCode = undefined;
    await admin.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Password reset failed." });
  }
};

const addAdminBankDetails = asyncHandler(async (req, res) => {
  const { bankCode, bankName, accountNumber, accountName } = req.body;
  const admin = await Admin.findById(req.admin._id);

  if (admin) {
    admin.bankCode = bankCode || admin.bankCode;
    admin.accountName = accountName || admin.accountName;
    admin.bankName = bankName || admin.bankName;
    admin.accountNumber = accountNumber || admin.accountNumber;

    try {
      if (bankCode && accountNumber) {
        admin.recipientCode = await generateRecipientCode(
          accountNumber,
          bankCode,
          admin.name
        );
      }

      await admin.save();
      res.status(200).json({ message: "Bank details updated successfully." });
    } catch (error) {
      console.error("Error updating bank details:", error);
      res.status(500).json({ message: "Error updating bank details." });
    }
  } else {
    res.status(404).json({ message: "Admin not found." });
  }
});

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

  // Find the admin by email
  const admin = await Admin.findOne({ email });

  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  // Generate a verification code
  const verificationCode = generateVerificationCode(12);
  admin.verificationCode = verificationCode;
  await admin.save();

  // Set up the email options
  const mailOptions = {
    to: email,
    from: "no-reply@yourapp.com", // Replace with your app's email
    subject: "Password Reset Request",
    text: `
        <h1>Password Reset</h1>
        <p>Hello ${admin.username || admin.name},</p>
        <p>You recently requested to reset your password. To reset your password, please enter the verification code below:</p>
        <p>Verification Code: ${verificationCode}</p>
        <p>This code expires in 3 hours.</p>
        <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>Thank you,</p>
        <p>Your App Team</p>
      `,
  };

  // Send the email
  await sendEmail(mailOptions);

  res.json({ message: "Password reset code sent to your email" });
});

const editPassword = asyncHandler(async (req, res) => {
  const { adminId, currentPassword, newPassword } = req.body;

  const admin = await Admin.findById(adminId);

  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  const isMatch = await admin.matchPassword(currentPassword);

  if (!isMatch) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  admin.password = newPassword;

  await admin.save();

  res.json({ message: "Password updated successfully" });
});

export {
  authAdmin,
  registerAdmin,
  logoutAdmin,
  getAdminProfile,
  updateAdminProfile,
  resetAdminPassword,
  addAdminBankDetails,
  forgotPassword,
  editPassword,
};
