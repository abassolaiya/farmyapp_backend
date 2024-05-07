import asyncHandler from "express-async-handler";

import LogisticsVehicle from "../../models/logistics/logisticsVehicleModel.js";
import cloudinary from "../../utils/cloudinary.js";
import Logistics from "../../models/logistics/logisticsModel.js";
import slugify from "slugify";

const getAllVehicles = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 24;

  const keyword = req.query.keyword
    ? {
        plateNum: {
          $regex: req.query.keyword,
          $options: "si",
        },
      }
    : {};
  const count = await LogisticsVehicle.countDocuments({ ...keyword });

  const vehicle = await LogisticsVehicle.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ vehicle, page, pages: Math.ceil(count / pageSize) });
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

  res.json({
    vehicles,
    page,
    pages: Math.ceil(count / pageSize),
  });
});

const getLogisticsVehicleBySlug = asyncHandler(async (req, res) => {
  const logisticsSlug = req.params.logisticsSlug;

  const logistics = await Logistics.findOne({ slug: logisticsSlug });

  if (!logistics) {
    req.status(404).json({ error: "Logistics Company not forund" });
    return;
  }

  const userId = logistics.userId;
  const vehicle = await LogisticsVehicle.find({
    logistics: userId,
    slug: req.params.slug,
  });
  if (vehicle) res.json(vehicle);
  else {
    res.status(404);
    throw new Error("vehicle not found");
  }
});

const getAVehicleBySlug = asyncHandler(async (req, res) => {
  const vehicle = await LogisticsVehicle.find({ slug: req.params.slug });
  if (vehicle) res.json(vehicle);
  else {
    res.status(404);
    throw new Error("vehicle not found");
  }
});

const deleteLogisticsVehicle = asyncHandler(async (req, res) => {
  const vehicle = await LogisticsVehicle.findById(req.params.id);
  if (vehicle) {
    await vehicle.deleteOne();
    res.json({ message: "Vehicle removed from Database" });
  } else {
    res.status(404);
    throw new Error("Vehicle Not Found");
  }
});

const createLogisticsVehicle = asyncHandler(async (req, res) => {
  const { vehicleType, plateNum, price } = req.body;

  let image = null;

  const slug = slugify(plateNum, { lower: true });

  if (req.file) {
    const result = await cloudinary(req.file.path);
    image = result.secure_url;
  }

  const vehicle = new LogisticsVehicle({
    vehicleType,
    plateNum,
    image: image,
    price,
    userId: req.logistics._id,
    slug,
  });
  const createVehicle = await vehicle.save();
  res.status(201).json(createVehicle);
});

const updateLogisticsVehicle = asyncHandler(async (req, res) => {
  const { vehicleType, plateNum, price } = req.body;
  const vehicle = await LogisticsVehicle.findOne({ slug: req.params.slug });
  const image = null;

  if (vehicle) {
    if (vehicleType) vehicle.vehicleType = vehicleType;
    if (plateNum) vehicle.plateNum = plateNum;
    if (price) vehicle.price = price;
    if (plateNum) vehicle.slug = slugify(plateNum, { lower: true });

    const updatedVehicle = await vehicle.save();
    if (updatedVehicle) res.status(201).json(updatedVehicle);
  } else {
    res.status(404);
    throw new Error("Vehicle not found");
  }
});

const searchLogisticsVehicles = asyncHandler(async (req, res) => {
  try {
    const { latitude, longitude, distance, vehicleType, logisticsName } = req.body;
    const maxDistance = distance || 10;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and longitude are required parameters.",
      });
    }

    const userLocation = [parseFloat(longitude), parseFloat(latitude)];
    let logisticsCompanies;

    try {
      logisticsCompanies = await Logistics.aggregate([
        {
          $unwind: "$officeLocations",
        },
        {
          $addFields: {
            "officeLocations.distanceKilometers": {
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
                    0.001, // Convert meters to kilometers
                    {
                      $multiply: [
                        6371, // Earth radius in kilometers
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
                  ],
                },
              },
            },
          },
        },
        {
          $match: {
            "officeLocations.distanceKilometers": { $lte: maxDistance },
          },
        },
      ]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!logisticsCompanies || logisticsCompanies.length === 0) {
      return res.status(404).json({
        message: "No logistics companies found within the specified distance.",
      });
    }

    const logisticsIds = logisticsCompanies.map((logistics) => logistics._id);
    const query = {
      userId: { $in: logisticsIds },
    };

    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    if (logisticsName) {
      query.userId = logisticsCompanies.find(
        (logistics) => logistics.logisticsName === logisticsName
      )._id;
    }

    const logisticsVehicles = await LogisticsVehicle.find(query);

    if (!logisticsVehicles || logisticsVehicles.length === 0) {
      return res.status(404).json({
        message: "No logistics vehicles found within the specified criteria.",
      });
    }

    res.json({ logisticsVehicles });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});



export {
  getAllVehicles,
  getLogisticsVehiclesBySlug,
  getLogisticsVehicleBySlug,
  deleteLogisticsVehicle,
  createLogisticsVehicle,
  updateLogisticsVehicle,
  getAVehicleBySlug,
  searchLogisticsVehicles,
};
