import Company from "../../models/company/company.js";
import paginate from "../../utils/pagination.js"; // Import your pagination utility
import asyncHandler from "express-async-handler";

const adminGetCompanies = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query;

  const query = {
    ...(search && { companyName: { $regex: search, $options: "i" } }), // Search by company name
    ...(status && { status }),
  };

  try {
    // Use the paginate utility to get paginated results
    const paginatedCompanies = await paginate(Company, query, page, limit);

    res.status(200).json(paginatedCompanies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const adminGetCompanyDetail = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  try {
    const company = await Company.findById(companyId).select("-password"); // Exclude password field for security

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json(company);
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const adminUpdateCompanyStatus = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { status } = req.body;

  if (!["active", "inactive", "pending"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const company = await Company.findByIdAndUpdate(
      companyId,
      { status },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({ message: "Company status updated", company });
  } catch (error) {
    console.error("Error updating company status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export { adminGetCompanies, adminUpdateCompanyStatus, adminGetCompanyDetail };
