import Farm from "../../models/farms/farmerModel.js";
import paginate from "../../utils/pagination.js";
import asyncHandler from "express-async-handler";

const adminGetFarmers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query; // Extract query parameters

  // Create a query object for filtering
  const query = {
    ...(search && { farmName: { $regex: search, $options: "i" } }), // Search by farm name
    ...(status && { status }), // Filter by status if provided
  };

  try {
    const paginatedFarmers = await paginate(Farm, query, page, limit);

    res.status(200).json(paginatedFarmers);
  } catch (error) {
    console.error("Error fetching farmers:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const adminUpdateFarmStatus = asyncHandler(async (req, res) => {
  const { id, status } = req.body;

  try {
    const farm = await Farm.findById(id);
    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    farm.status = status; // Update the farm status
    await farm.save();

    res.status(200).json({ message: "Farm status updated successfully" });
  } catch (error) {
    console.error("Error updating farm status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const adminGetFarmerDetails = asyncHandler(async (req, res) => {
  const { id } = req.params; // Get farm ID from URL parameters

  const farm = await Farm.findById(id).select("-password"); // Exclude password from the response

  if (!farm || farm.isDeleted) {
    res.status(404);
    throw new Error("Farmer not found");
  }

  res.json(farm);
});

export { adminGetFarmers, adminUpdateFarmStatus, adminGetFarmerDetails };
