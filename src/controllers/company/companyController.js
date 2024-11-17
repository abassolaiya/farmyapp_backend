import asyncHandler from "express-async-handler";
import Company from "../../models/company/company.js";
import { cloudinary } from "../../utils/cloudinary.js";
import generateToken from "../../utils/generateCompanyToken.js";
import slugify from "slugify";
import CompanyProduct from "../../models/company/companyProductModel.js";
import CompanyCategory from "../../models/company/companyCategory.js";
import { sendEmail } from "../../utils/mailing.js";
import TokenBlacklist from "../../models/tokenBlackListModel.js";

const authCompany = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Trim leading and trailing spaces from the email
  const trimmedEmail = email.trim();

  const company = await Company.findOne({ email: trimmedEmail });

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

    // Trim spaces from the email
    const trimmedEmail = email.trim();

    const existingCompanyEmail = await Company.findOne({ email: trimmedEmail });
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
      email: trimmedEmail,
      username,
      phoneNumber,
      password,
      slug,
      avatar,
      coverPhoto,
      referralId,
    });

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
  const locationId = req.params.locationId;
  const { address, city, coordinates, closed } = req.body;

  try {
    const company = await Company.findById(req.company._id);

    if (!company) {
      res.status(404);
      throw new Error("Company not found");
    }

    // Find the location you want to edit
    const location = company.companyLocations.id(locationId);

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

const getAdminCompanyProfile = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  // const products = await CompanyProduct.find({ userId: req.company._id });
  // const categories = await CompanyCategory.find({ userId: req.company._id });

  const company = await Company.findById(companyId)
    .select("-password") // Exclude password
    .populate("transactions") // Populate transactions
    .populate("carts") // Populate carts
    .populate("orders") // Populate orders
    .populate("products")
    .populate("categories"); // Populate products

  if (company) {
    res.json(company);
  } else {
    res.status(404);
    throw new Error("Company not found");
  }
});

const AdminGetCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find()
    .select("-password") // Exclude passwords
    .sort({ name: 1 });

  res.json(companies);
});

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
      closed: company.closed,
      schedule: company.schedule,
    });
  } else {
    res.status(404);
    throw new Error("Company not found");
  }
});

const getCompanies = asyncHandler(async (req, res) => {
  const { latitude, longitude, distance, searchTerm, day, time } = req.query;
  const maxDistance = distance || 500000;

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and longitude are required parameters.",
    });
  }

  const userLocation = [parseFloat(longitude), parseFloat(latitude)];

  const matchCriteria = {
    $or: [{ deleted: false }, { deleted: { $exists: false } }],
    closed: false,
  };

  if (searchTerm) {
    matchCriteria.$or = [
      { name: { $regex: new RegExp(searchTerm, "i") } },
      { _id: searchTerm },
      { slug: searchTerm },
    ];
  }

  if (day && time) {
    matchCriteria.schedule = {
      $elemMatch: {
        day,
        openingTime: { $lte: time },
        closingTime: { $gte: time },
      },
    };
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
        $match: {
          "companyLocations.closed": false,
        },
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
    if (req.body.name) company.companyName = req.body.name;
    if (req.body.companyAddress)
      company.companyAddress = req.body.companyAddress;
    if (req.body.city) company.city = req.body.city;
    if (req.body.username) {
      company.username = req.body.username;
      company.slug = slugify(req.body.username, { lower: true });
    }
    if (req.body.phoneNumber) company.phoneNumber = req.body.phoneNumber;
    if (req.body.email) company.email = req.body.email;

    if (req.files && req.files.avatar) {
      const avatarResult = await cloudinary(req.files.avatar[0].path);
      company.avatar = avatarResult.secure_url;
    }

    if (req.files && req.files.coverPhoto) {
      const coverPhotoResult = await cloudinary(req.files.coverPhoto[0].path);
      company.coverPhoto = coverPhotoResult.secure_url;
    }

    if (req.body.schedule) {
      try {
        company.schedule = JSON.parse(req.body.schedule);
      } catch (error) {
        console.error("Error parsing schedule JSON:", error);
        return res
          .status(400)
          .json({ message: "Invalid schedule data format" });
      }
    }

    if (req.body.closed !== undefined) {
      company.closed = req.body.closed === "true"; // Ensure closed is saved as a boolean
    }

    const updatedCompany = await company.save();

    res.json({
      _id: updatedCompany._id,
      companyName: updatedCompany.companyName,
      companySlug: updatedCompany.slug,
      email: updatedCompany.email,
      avatar: updatedCompany.avatar,
      coverPhoto: updatedCompany.coverPhoto,
      schedule: updatedCompany.schedule,
      closed: updatedCompany.closed,
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

  // Trim leading and trailing spaces from the email
  const trimmedEmail = email.trim();

  const company = await Company.findOne({ email: trimmedEmail });

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const verificationCode = generateVerificationCode(12);
  company.verificationCode = verificationCode;
  await company.save();

  const mailOptions = {
    to: trimmedEmail,
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

const resetPassword = async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  // Trim leading and trailing spaces from the email
  const trimmedEmail = email.trim();

  try {
    const company = await Company.findOne({
      email: trimmedEmail,
      verificationCode,
    });

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

const deleteCompanyAccount = asyncHandler(async (req, res) => {
  const companyId = req.company._id;

  try {
    const { email, password } = req.body;

    const company = await Company.findOne({ email });

    if (!company) {
      res.status(404);
      throw new Error("User not found");
    }

    if (!(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    company.deleted = true;
    company.deletedAt = Date.now();
    await company.save();

    // Send an email with a link to recover the account within 30 days
    const recoverLink = `https://farmyapp.com/recover-account`;
    const mailOptions = {
      to: email,
      from: "no-reply@farmyapp.com",
      subject: "Account Deletion Confirmation",
      text: `
      <h1>Account Deletion Confirmation</h1>
      <p>Hello ${company.username},</p>
      <p>Your account has been deleted. If you want to recover your account, please click on the link below within 30 days:</p>
      <p>${recoverLink}</p>
      <p>If you did not request account deletion, please click the recovery link as someone must have deleted your account or Your account will remain deleted.</p>
      <p>Thank you,</p>
      <p>Your FarmyApp Team</p>
    `,
    };
    await sendEmail(mailOptions);

    res.status(200).json({ message: "Company account deleted successfully" });
  } catch (error) {
    console.error("Error deleting company account:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const recoverCompanyAccount = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const company = await Company.findOne({ email, isDeleted: true });

  if (company && (await company.matchPassword(password))) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (company.deletedAt > thirtyDaysAgo) {
      company.isDeleted = false;
      company.deletedAt = null;
      await company.save();

      res.status(200).json({ message: "Account recovered successfully." });
    } else {
      res.status(400).json({ message: "Recovery period has expired." });
    }
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
});

const closeCompany = asyncHandler(async (req, res) => {
  const companyId = req.params.id;

  try {
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.closed = true;
    await company.save();

    res.status(200).json({ message: "Company closed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const closeCompanyLocation = asyncHandler(async (req, res) => {
  const { companyId, locationId } = req.params;

  try {
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const location = company.companyLocations.id(locationId);

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    location.closed = true;
    await company.save();

    res.status(200).json({ message: "Company location closed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getCompanyLocation = asyncHandler(async (req, res) => {
  const locationId = req.params.locationId;
  try {
    const company = await Company.findOne(
      { "companyLocations._id": locationId },
      { "companyLocations.$": 1 }
    );

    if (!company || !company.companyLocations.length) {
      res.status(404);
      throw new Error("Location not found");
    }

    const location = company.companyLocations[0];
    res.status(200).json(location);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

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
  deleteCompanyAccount,
  recoverCompanyAccount,
  closeCompany,
  closeCompanyLocation,
  getCompanyLocation,
};
