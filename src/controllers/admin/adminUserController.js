import asyncHandler from "express-async-handler";
import User from "../../models/buyer/userModel.js";
import paginate from "../../utils/pagination.js";

const adminGetUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 24, search = "", status } = req.query; // Get page, limit, search, and status from query parameters

  const query = {
    isDeleted: false,
  };

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (status) {
    query.status = status;
  }

  const paginatedUsers = await paginate(User, query, page, limit);

  res.json(paginatedUsers);
});

const adminGetUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params; // Get user ID from URL parameters

  const user = await User.findById(id).select("-password"); // Exclude password from the response

  if (!user || user.isDeleted) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json(user);
});

export { adminGetUsers, adminGetUserDetails };
