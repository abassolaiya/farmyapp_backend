import asyncHandler from "express-async-handler";
import Company from "../../models/company/company.js";
import cloudinary from "../../utils/cloudinary.js";
import generateToken from "../../utils/generateCompanyToken.js";
import slugify from "slugify";
import CompanyProduct from "../../models/company/companyProductModel.js";
import CompanyCategory from "../../models/company/companyCategory.js";
import { sendEmail } from "../../utils/mailing.js";
import TokenBlacklist from "../../models/tokenBlackListModel.js";

const authCompany = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const company = await Company.findOne({ email });

  if (!company) {
    res.status(401);
    throw new Error("Company with this email does not exist");
  }

  if (!company.wallet) {
    company.wallet = {
      temporaryBalance: 0,
      finalBalance: 0,
    };
    await company.save();
  }

  const isPasswordValid = await company.matchPassword(password);

  if (company && isPasswordValid) {
    const token = generateToken(company._id);

    res.json({
      _id: company._id,
      companyName: company.companyName,
      email: company.email,
      avatar: company.avatar,
      coverPhoto: company.coverPhoto,
      slug: company.slug,
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

const registerCompany = asyncHandler(async (req, res) => {
  try {
    const {
      companyName,
      companyAddress,
      city,
      email,
      username,
      phoneNumber,
      password,
      referralId,
    } = req.body;

    const existingCompanyEmail = await Company.findOne({ email });
    const existingCompanyPhone = await Company.findOne({ phoneNumber });
    const existingCompanyUsername = await Company.findOne({ username });

    if (existingCompanyEmail) {
      return res
        .status(400)
        .json({ error: "Company already exists with this email" });
    }

    if (existingCompanyPhone) {
      return res
        .status(400)
        .json({ error: "Company already exists with this phone number" });
    }

    if (existingCompanyUsername) {
      return res
        .status(400)
        .json({ error: "Company already exists with this Username" });
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

    const company = await Company.create({
      companyName,
      companyAddress,
      city,
      email,
      username,
      phoneNumber,
      password,
      slug,
      avatar,
      coverPhoto,
      referralId,
    });
    // console.log(company);
    if (!company) {
      return res.status(400).json({ error: "Failed to create company" });
    }

    const token = generateToken(company._id);

    res.status(201).json({
      _id: company._id,
      companyName: company.companyName,
      email: company.email,
      avatar,
      slug: company.slug,
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
      res
        .status(500)
        .json({ error: "Server error: Failed to register company" });
    }
  }
});

const addCompanyLocation = asyncHandler(async (req, res) => {
  const { address, city, coordinates } = req.body;

  try {
    const company = await Company.findById(req.company._id);

    if (!company) {
      res.status(404);
      throw new Error("Company not found");
    }

    const location = {
      address,
      city,
      coordinates: {
        type: "Point",
        coordinates: coordinates,
      },
    };

    company.companyLocations.push(location);

    await company.save();

    res.status(201).json({
      message: "Company location added successfully",
      location,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const editCompanyLocation = asyncHandler(async (req, res) => {
  const locationId = req.params.id;
  const { address, city, coordinates } = req.body;

  try {
    const company = await Company.findById(req.company._id);

    if (!company) {
      res.status(404);
      throw new Error("Company not found");
    }

    const location = company.companyLocations.id(locationId);

    if (!location) {
      res.status(404);
      throw new Error("Location not found");
    }

    location.address = address;
    location.city = city;
    location.coordinates = {
      type: "Point",
      coordinates: coordinates,
    };

    await company.save();

    res.status(200).json({
      message: "Company location updated successfully",
      location,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const deleteCompanyLocation = asyncHandler(async (req, res) => {
  const locationId = req.params.locationId;

  try {
    const company = await Company.findById(req.company._id);

    if (!company) {
      res.status(404);
      throw new Error("Company not found");
    }

    company.companyLocations.pull({ _id: locationId });

    await company.save();

    res.status(200).json({ message: "Company location deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const logoutCompany = async (req, res) => {
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

const getCompanyProfile = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.company._id);
  const products = await CompanyProduct.find({ userId: req.company._id });
  const categories = await CompanyCategory.find({ userId: req.company._id });
  // console.log(company)
  if (company) {
    res.json({
      _id: company._id,
      companyName: company.companyName,
      companyAddress: company.companyAddress,
      city: company.city,
      email: company.email,
      username: company.username,
      phoneNumber: company.phoneNumber,
      avatar: company.avatar,
      coverPhoto: company.coverPhoto,
      slug: company.slug,
      companyLocations: company.companyLocations,
      products,
      categories,
      wallet: company.wallet,
      bankCode: company.bankCode,
    });
  } else {
    res.status(404);
    throw new Error("Company not found");
  }
});

const getCompanies = asyncHandler(async (req, res) => {
  const { latitude, longitude, distance, searchTerm } = req.query;
  const maxDistance = distance || 500000;

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and longitude are required parameters.",
    });
  }

  const userLocation = [parseFloat(longitude), parseFloat(latitude)];

  const matchCriteria = {};
  if (searchTerm) {
    matchCriteria.$or = [
      { name: { $regex: new RegExp(searchTerm, "i") } },
      { _id: searchTerm },
      { slug: searchTerm },
    ];
  }

  try {
    const companies = await Company.aggregate([
      {
        $match: matchCriteria,
      },
      {
        $unwind: "$companyLocations",
      },
      {
        $addFields: {
          "companyLocations.distanceMeters": {
            $let: {
              vars: {
                lat1: {
                  $arrayElemAt: [
                    "$companyLocations.coordinates.coordinates",
                    1,
                  ],
                },
                lon1: {
                  $arrayElemAt: [
                    "$companyLocations.coordinates.coordinates",
                    0,
                  ],
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
          "companyLocations.distanceMeters": { $lte: maxDistance },
        },
      },
      {
        $project: {
          password: 0,
          companyAddress: 0,
          email: 0,
          phoneNumber: 0,
          city: 0,
        },
      },
      {
        $sort: {
          "companyLocations.distanceMeters": 1,
        },
      },
    ]);

    if (companies.length === 0) {
      return res.status(404).json({
        message: "No companies found within the specified distance.",
      });
    }

    res.json({ companies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getCompanyProfileBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug;

  try {
    const company = await Company.findOne({ slug });
    const products = await CompanyProduct.find({ userId: company._id });
    const categories = await CompanyCategory.find({ userId: company._id });

    if (company) {
      res.json({
        _id: company._id,
        companyName: company.companyName,
        companyAddress: company.companyAddress,
        city: company.city,
        email: company.email,
        username: company.username,
        phoneNumber: company.phoneNumber,
        avatar: company.avatar,
        coverPhoto: company.coverPhoto,
        slug: company.slug,
        companyLocations: company.companyLocations,
        products,
        categories,
      });
    } else {
      res.status(404);
      throw new Error("Company not found");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updateCompanyProfile = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.company._id);

  if (company) {
    if (req.body.name) {
      company.companyName = req.body.name;
    }
    if (req.body.companyAddress) {
      company.companyAddress = req.body.companyAddress;
    }
    if (req.body.city) {
      company.city = req.body.city;
    }
    if (req.body.username) {
      company.username = req.body.username;
      company.slug = slugify(req.body.username, { lower: true });
    }
    if (req.body.phoneNumber) {
      company.phoneNumber = req.body.phoneNumber;
    }
    if (req.body.email) {
      company.email = req.body.email;
    }
    // Update avatar
    if (req.files && req.files.avatar) {
      const avatarResult = await cloudinary(req.files.avatar[0].path);
      company.avatar = avatarResult.secure_url; // corrected line
    }

    // Update coverPhoto
    if (req.files && req.files.coverPhoto) {
      const coverPhotoResult = await cloudinary(req.files.coverPhoto[0].path);
      company.coverPhoto = coverPhotoResult.secure_url; // corrected line
    }

    const updatedCompany = await company.save();

    res.json({
      _id: updatedCompany._id,
      companyName: updatedCompany.companyName, // corrected typo (CompanyName to companyName)
      companySlug: updatedCompany.slug,
      email: updatedCompany.email,
      avatar: updatedCompany.avatar,
      coverPhoto: updatedCompany.coverPhoto,
    });
  } else {
    res.status(404);
    throw new Error("Company not found");
  }
});

const addBankDetails = asyncHandler(async (req, res) => {
  const { bankCode, bankName, accountNumber, accountName } = req.body;
  const company = await Company.findById(req.company._id);

  if (company) {
    company.bankCode = bankCode || company.bankCode;
    company.bankName = bankName || company.bankName;
    company.accountName = accountName || company.accountName;
    company.accountNumber = accountNumber || company.accountNumber;

    // Logic to generate recipient code and assign it to the user
    // try {
    //   if (bankCode && accountNumber) {
    //     company.recipientCode = await generateRecipientCode(accountNumber, bankCode);
    //   }
    // } catch (error) {
    //   res.status(500).json({ message: 'Error generating recipient code' });
    //   return;
    // }
    // console.log(company);
    const updatedCompany = await company.save();

    res.json({
      _id: updatedCompany._id,
      companyName: updatedCompany.CompanyName,
      bankCode: updatedCompany.bankCode,
      bankName: updatedCompany.bankName,
      accountName: updatedCompany.accountName,
      accountNumber: updatedCompany.accountNumber,
      recipientCode: updatedCompany.recipientCode,
    });
  } else {
    res.status(404);
    throw new Error("Company not found");
  }
});

const editPassword = async (req, res) => {
  const companyId = req.company._id;
  const { currentPassword, newPassword } = req.body;

  try {
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const passwordMatch = await company.matchPassword(currentPassword);

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    company.password = newPassword;

    await company.save();

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

  const company = await Company.findOne({ email });

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const verificationCode = generateVerificationCode(12);
  company.verificationCode = verificationCode;
  await company.save();

  const mailOptions = {
    to: email,
    from: "no-reply@farmyapp.com",
    subject: "Password Reset Request",
    text: `
        <h1>Password Reset</h1>
        <p>Hello ${company.username},</p>
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
//     const company = await company.findOne({ email });

//     if (!company) {
//       return res.status(400).json({ message: "company not found." });
//     }

//     const verificationCode = generateVerificationCode(12);
//     company.verificationCode = verificationCode;
//     await company.save();

//     const msg = {
//       to: company.email,
//       from: "no-reply@farmyyapp.com",
//       subject: "Password Reset Request",
//       html: `
//           <h1>Password Reset</h1>
//           <p>Hello ${company.firstName},</p>
//           <p>You recently requested to reset your password. To reset your password, please enter the verification code below:</p>
//           <p>Verification Code: ${verificationCode}</p>
//           <a href="https://Farmyapp.com/company/reset-password" target="_blank">Reset Password</a>
//           <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
//           <p>Thank you,</p>
//           <p>Your companyyApp Team</p>
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
  // console.log(req.body);
  try {
    const company = await Company.findOne({ email, verificationCode });

    if (!company) {
      return res
        .status(400)
        .json({ message: "Invalid email or verification code." });
    }

    company.password = newPassword;
    company.verificationCode = undefined;
    await company.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Password reset failed." });
  }
};

export {
  authCompany,
  registerCompany,
  logoutCompany,
  getCompanyProfile,
  updateCompanyProfile,
  getCompanies,
  addCompanyLocation,
  deleteCompanyLocation,
  editCompanyLocation,
  getCompanyProfileBySlug,
  editPassword,
  forgotPassword,
  resetPassword,
  addBankDetails,
};
