import asyncHandler from "express-async-handler";
import Logistics from "../../models/logistics/logisticsModel.js";
import cloudinary from "../../utils/cloudinary.js";
import LogisticsVehicle from "../../models/logistics/logisticsVehicleModel.js";
import generateToken from "../../utils/generateLogToken.js";
import TokenBlacklist from "../../models/tokenBlackListModel.js";

import slugify from "slugify";
import { sendEmail } from "../../utils/mailing.js";

const authLogistics = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const logistics = await Logistics.findOne({ email });
  if (!logistics.wallet) {
    logistics.wallet = {
      temporaryBalance: 0,
      finalBalance: 0,
    };

    await logistics.save();
  }

  if (logistics && (await logistics.matchPassword(password))) {
    const token = generateToken(logistics._id);

    res.json({
      _id: logistics._id,
      logisticsName: logistics.logisticsName,
      email: logistics.email,
      avatar: logistics.avatar,
      coverPhoto: logistics.coverPhoto,
      slug: logistics.slug,
      token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

const registerLogistics = asyncHandler(async (req, res) => {
  const {
    logisticsName,
    logisticsAddress,
    email,
    username,
    phoneNumber,
    password,
    referralId,
  } = req.body;

  try {
    const logisticsExists = await Logistics.findOne({ email });
    const existingLogisticsPhone = await Logistics.findOne({ phoneNumber });
    const existingLogisticsUsername = await Logistics.findOne({ username });

    if (logisticsExists) {
      return res
        .status(400)
        .json({ error: "Logistics company already exists" });
    }

    if (existingLogisticsPhone) {
      return res
        .status(400)
        .json({ error: "Logistics already exists with this phone number" });
    }

    if (existingLogisticsUsername) {
      return res
        .status(400)
        .json({ error: "Logistics already exists with this username" });
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

    const logistics = await Logistics.create({
      logisticsName,
      logisticsAddress,
      email,
      username,
      phoneNumber,
      password,
      avatar,
      coverPhoto,
      referralId,
      slug,
    });

    if (logistics) {
      const token = generateToken(logistics._id);

      return res.status(201).json({
        _id: logistics._id,
        logisticsName: logistics.logisticsName,
        email: logistics.email,
        phoneNumber: logistics.phoneNumber,
        avatar,
        coverPhoto,
        slug: logistics.slug,
        token,
      });
    } else {
      return res.status(400).json({ message: "Invalid logistics data" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error: Failed to register logistics company" });
  }
});

const addOfficeLocation = asyncHandler(async (req, res) => {
  const { address, city, coordinates } = req.body;
  try {
    const logistics = await Logistics.findById(req.logistics._id);

    if (!logistics) {
      res.status(404);
      throw new Error("Logistics company not found not found");
    }

    const location = {
      address,
      city,
      coordinates: {
        type: "Point",
        coordinates: coordinates,
      },
    };

    logistics.officeLocations.push(location);

    await logistics.save();

    res.status(201).json({
      message: "Office location add successfully",
      location,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const editOfficeLocation = asyncHandler(async (req, res) => {
  const { address, city, coordinates } = req.body;
  const logisticsId = req.logistics._id;
  const locationId = req.params.id; // Assuming you pass the location ID in the URL

  try {
    const logistics = await Logistics.findById(logisticsId);

    if (!logistics) {
      return res.status(404).json({ message: "Logistics company not found" });
    }

    const location = logistics.officeLocations.id(locationId);

    if (!location) {
      return res.status(404).json({ message: "Office location not found" });
    }

    // Update the location's properties
    location.address = address;
    location.city = city;
    location.coordinates = {
      type: "Point",
      coordinates: coordinates,
    };

    await logistics.save();

    res.json({ message: "Office location updated successfully", location });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const deleteOfficeLocation = asyncHandler(async (req, res) => {
  const logisticsId = req.logistics._id;
  const locationId = req.params.id;

  try {
    const logistics = await Logistics.findById(logisticsId);

    if (!logistics) {
      return res.status(404).json({ message: "Logistics company not found" });
    }

    logistics.officeLocations.pull({ _id: locationId }); // Use pull to remove the subdocument

    await logistics.save();

    res.json({ message: "Office location deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const logoutLogistics = async (req, res) => {
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

const updateLogisticsProfile1 = asyncHandler(async (req, res) => {
  const logistics = await Logistics.findById(req.logistics._id);

  if (logistics) {
    logistics.logisticsName = req.body.logisticsName || logistics.logisticsName;
    logistics.logisticsAddress =
      req.body.logisticsAddress || logistics.logisticsAddress;
    logistics.city = req.body.city || logistics.city;
    logistics.email = req.body.email || logistics.email;
    logistics.username = req.body.username || logistics.username;
    logistics.phoneNumber = req.body.phoneNumber || logistics.phoneNumber;
    // Update avatar
    if (req.files && req.files.avatar) {
      const avatarResult = await cloudinary(req.files.avatar[0].path);
      logistics.avatar = avatarResult.secure_url;
    }

    // Update coverPhoto
    if (req.files && req.files.coverPhoto) {
      const coverPhotoResult = await cloudinary(req.files.coverPhoto[0].path);
      logistics.coverPhoto = coverPhotoResult.secure_url;
    }

    if (req.body.password) {
      logistics.password = req.body.password;
    }

    const updatedLogistics = await logistics.save();

    res.json({
      _id: updatedLogistics._id,
      logisticsName: updatedLogistics.logisticsName,
      email: updatedLogistics.email,
      slug: updatedLogistics.slug,
      username: updatedLogistics.username,
      phoneNumber: updatedLogistics.phoneNumber,
      avatar: updatedLogistics.avatar,
      coverPhoto: updatedLogistics.coverPhoto,
    });
  } else {
    res.status(404);
    throw new Error("Logistics Company not found");
  }
});

const getLogisticsProfile = asyncHandler(async (req, res) => {
  const logistics = await Logistics.findById(req.logistics._id);

  const vehicles = await LogisticsVehicle.find({ userId: req.logistics._id });
  if (logistics) {
    res.json({
      _id: logistics._id,
      logisticsName: logistics.logisticsName,
      email: logistics.email,
      slug: logistics.slug,
      username: logistics.username,
      phoneNumber: logistics.phoneNumber,
      avatar: logistics.avatar,
      coverPhoto: logistics.coverPhoto,
      officeLocations: logistics.officeLocations,
      vehicles,
      wallet: logistics.wallet,
      bankCode: logistics.bankCode,
    });
  } else {
    res.status(404);
    throw new Error("Logistics Company not found");
  }
});

const getLogistics = asyncHandler(async (req, res) => {
  const { latitude, longitude, distance } = req.query;
  const maxDistance = distance || 5000; // Maximum distance in meters

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and longitude are required parameters.",
    });
  }

  // Convert latitude and longitude to numbers
  const userLocation = [parseFloat(longitude), parseFloat(latitude)];

  try {
    const logisticsCompanies = await Logistics.aggregate([
      {
        $unwind: "$officeLocations",
      },
      {
        $addFields: {
          "officeLocations.distanceMeters": {
            $let: {
              vars: {
                lat1: {
                  $arrayElemAt: ["$officeLocations.coordinates.coordinates", 1],
                },
                lon1: {
                  $arrayElemAt: ["$officeLocations.coordinates.coordinates", 0],
                },
                lat2: userLocation[1],
                lon2: userLocation[0],
              },
              in: {
                $multiply: [
                  6371000, // Earth radius in meters
                  {
                    $acos: {
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
                  },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          "officeLocations.distanceMeters": { $lte: maxDistance },
        },
      },
      {
        $addFields: {
          "officeLocations.logisticsCompany": "$$ROOT", // Add logistics company information to each office location
        },
      },
      {
        $project: {
          _id: 0, // Exclude the document ID
          password: 0, // Exclude the password field
          logisticsAddress: 0, // Exclude the logisticsAddress field
          email: 0, // Exclude the email field
          phoneNumber: 0, // Exclude the phoneNumber field
        },
      },
      {
        $sort: {
          "officeLocations.distanceMeters": 1,
        },
      },
    ]);

    if (logisticsCompanies.length === 0) {
      return res.status(404).json({
        message: "No logistics companies found within the specified distance.",
      });
    }

    res.json({ logisticsCompanies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const getLogisticsDetail1 = asyncHandler(async (req, res) => {
  const { logisticsSlug, officeLocationId } = req.params;

  try {
    // Find the logistics company by slug.
    const logistics = await Logistics.findOne({ slug: logisticsSlug });

    if (!logistics) {
      return res.status(404).json({ error: "Logistics company not found" });
    }

    // Find the selected office location within the logistics company.
    const selectedLocation = logistics.officeLocations.find(
      (location) => location._id.toString() === officeLocationId
    );

    if (!selectedLocation) {
      return res.status(404).json({
        error: "Office location not found within this logistics company",
      });
    }

    // Return detailed information about the logistics company and the selected office.
    res.json({
      logistics: {
        logisticsName: logistics.logisticsName,
        email: logistics.email,
        username: logistics.username,
        phoneNumber: logistics.phoneNumber,
        avatar: logistics.avatar,
        coverPhoto: logistics.avatar,
        slug: logistics.slug,
      },
      officeLocation: {
        address: selectedLocation.address,
        city: selectedLocation.city,
        coordinates: selectedLocation.coordinates,
        // Add other fields as needed.
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getLogisticsDetail = asyncHandler(async (req, res) => {
  const { logisticsSlug } = req.params;

  try {
    // Find the logistics company by slug.
    const logistics = await Logistics.findOne({ slug: logisticsSlug });

    if (!logistics) {
      return res.status(404).json({ error: "Logistics company not found" });
    }

    // Retrieve information about the logistics company and all its office locations.
    const logisticsData = {
      logistics: {
        logisticsName: logistics.logisticsName,
        email: logistics.email,
        username: logistics.username,
        phoneNumber: logistics.phoneNumber,
        avatar: logistics.avatar,
        coverPhoto: logistics.coverPhoto,
        slug: logistics.slug,
      },
      officeLocations: logistics.officeLocations.map((location) => ({
        address: location.address,
        city: location.city,
        coordinates: location.coordinates,
        // Add other fields as needed.
      })),
    };

    // Include the logistics vehicles owned by this company
    const logisticsVehicles = await LogisticsVehicle.find({
      userId: logistics._id,
    });

    logisticsData.logistics.vehicles = logisticsVehicles;

    // Return the detailed information.
    res.json(logisticsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getLogisticsVehiclesBySlug = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const logisticsSlug = req.params.LogisticsSlug;

  const logistics = await Logistics.findOne({ slug: logisticsSlug });

  if (!logistics) {
    res.status(404).json({ error: "Logistics Company not found" });
  }

  const userId = logistics._id;

  const keyword = req.query.keyword
    ? {
        userId: userId,
        plateNum: {
          $regex: req.query.keyword,
          $options: "si",
        },
      }
    : {
        userId: userId,
      };

  const count = await LogisticsVehicle.countDocuments({ ...keyword });

  const vehicles = await LogisticsVehicle.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  // Include logistics company details in the response
  const logisticsDetails = {
    logisticsName: logistics.logisticsName,
    email: logistics.email,
    username: logistics.username,
    phoneNumber: logistics.phoneNumber,
    avatar: logistics.avatar,
    coverPhoto: logistics.coverPhoto,
    slug: logistics.slug,
    officeLocations: logistics.officeLocations, // Include office locations
  };

  res.json({
    logistics: logisticsDetails,
    vehicles,
    page,
    pages: Math.ceil(count / pageSize),
  });
});

const editPassword = async (req, res) => {
  const logisticsId = req.logistics._id;
  const { currentPassword, newPassword } = req.body;

  try {
    const logistics = await Logistics.findById(logisticsId);

    if (!logistics) {
      return res.status(404).json({ message: "Logistics Company not found." });
    }

    const passwordMatch = await logistics.matchPassword(currentPassword);

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    logistics.password = newPassword;

    await logistics.save();

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

  const logistics = await Logistics.findOne({ email });

  if (!logistics) {
    res.status(404).json({ error: "Logistics company not found" });
    return;
  }

  const verificationCode = generateVerificationCode(12);
  user.verificationCode = verificationCode;
  await logistics.save();

  const mailOptions = {
    to: email,
    from: "no-reply@farmyapp.com",
    subject: "Password Reset Request",
    text: `
        <h1>Password Reset</h1>
        <p>Hello ${logistics.username},</p>
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
//     const logistics = await Logistics.findOne({ email });

//     if (!logistics) {
//       return res.status(400).json({ message: "Logistics not found." });
//     }

//     const verificationCode = generateVerificationCode(12);
//     logistics.verificationCode = verificationCode;
//     await logistics.save();

//     const msg = {
//       to: logistics.email,
//       from: "no-reply@logisticsyapp.com",
//       subject: "Password Reset Request",
//       html: `
//           <h1>Password Reset</h1>
//           <p>Hello ${logistics.firstName},</p>
//           <p>You recently requested to reset your password. To reset your password, please enter the verification code below:</p>
//           <p>Verification Code: ${verificationCode}</p>
//           <a href="https://Farmyapp.com/logistics/reset-password" target="_blank">Reset Password</a>
//           <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
//           <p>Thank you,</p>
//           <p>Your logisticsyApp Team</p>
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
    const logistics = await Logistics.findOne({ email, verificationCode });

    if (!logistics) {
      return res
        .status(400)
        .json({ message: "Invalid email or verification code." });
    }

    logistics.password = newPassword;
    logistics.verificationCode = undefined;
    await logistics.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Password reset failed." });
  }
};

const addBankDetails = asyncHandler(async (req, res) => {
  const { bankCode, bankName, accountNumber, accountName } = req.body;
  const logistics = await Logistics.findById(req.logistics._id);

  if (logistics) {
    logistics.bankCode = bankCode || logistics.bankCode;
    logistics.accountName = accountName || logistics.accountName;
    logistics.bankName = bankName || logistics.bankName;
    logistics.accountNumber = accountNumber || logistics.accountNumber;

    // try {
    //   if (bankCode && accountNumber) {
    //     logistics.recipientCode = await generateRecipientCode(accountNumber, bankCode);
    //   }
    // } catch (error) {
    //   res.status(500).json({ message: 'Error generating recipient code' });
    //   return;
    // }

    const updatedLogistics = await logistics.save();

    res.json({
      _id: updatedLogistics._id,
      logisticsName: updatedLogistics.logisticsName,
      bankCode: updatedLogistics.bankCode,
      bankName: updatedLogistics.bankName,
      accountName: updatedLogistics.accountName,
      accountNumber: updatedLogistics.accountNumber,
      recipientCode: updatedLogistics.recipientCode,
    });
  } else {
    res.status(404);
    throw new Error("Store not found");
  }
});

export {
  authLogistics,
  registerLogistics,
  logoutLogistics,
  updateLogisticsProfile1,
  getLogisticsProfile,
  addOfficeLocation,
  getLogistics,
  getLogisticsDetail1,
  getLogisticsDetail,
  editOfficeLocation,
  deleteOfficeLocation,
  editPassword,
  forgotPassword,
  resetPassword,
  addBankDetails,
};
