import asyncHandler from "express-async-handler";
import Store from "../../models/stores/sellerModel.js";
import paginate from "../../utils/pagination.js";

// Controller to get list of stores
const adminGetStores = asyncHandler(async (req, res) => {
  const { page = 1, limit = 24, search = "", status } = req.query;

  const query = {};

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (status) {
    query.status = status;
  }

  const paginatedStores = await paginate(Store, query, page, limit);

  res.json(paginatedStores);
});

export { adminGetStores };
