const paginate = async (model, query, page = 1, limit = 24) => {
  // Ensure page is a number
  const pageNumber = Math.max(1, page);

  // Convert limit to a number and ensure it's within a reasonable range
  const limitNumber = Math.max(1, limit);

  // Calculate total documents and total pages
  const totalDocuments = await model.countDocuments(query);
  const totalPages = Math.ceil(totalDocuments / limitNumber);

  // Fetch the data with pagination
  const items = await model
    .find(query)
    .limit(limitNumber)
    .skip((pageNumber - 1) * limitNumber)
    .sort({ createdAt: -1 }); // Sort by creation date in descending order

  return {
    items,
    totalDocuments,
    totalPages,
    currentPage: pageNumber,
  };
};

export default paginate;
