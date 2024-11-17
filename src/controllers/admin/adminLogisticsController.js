import Logistics from "../../models/logistics/logisticsModel.js";

const adminGetLogistics = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const filter = status ? { status } : {};

  try {
    const logisticsList = await Logistics.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Logistics.countDocuments(filter);

    res.json({
      logisticsList,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching logistics list", error });
  }
};

const adminGetLogisticsDetail = async (req, res) => {
  try {
    const logistics = await Logistics.findById(req.params.id);
    if (!logistics) {
      return res.status(404).json({ message: "Logistics not found" });
    }
    res.json(logistics);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching logistics details", error });
  }
};

const adminUpdateLogisticsStatus = async (req, res) => {
  const { status } = req.body;

  if (!["active", "inactive", "suspended"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const logistics = await Logistics.findById(req.params.id);
    if (!logistics) {
      return res.status(404).json({ message: "Logistics not found" });
    }

    logistics.status = status;
    await logistics.save();

    res.json({ message: "Logistics status updated successfully", logistics });
  } catch (error) {
    res.status(500).json({ message: "Error updating logistics status", error });
  }
};

export {
  adminGetLogistics,
  adminGetLogisticsDetail,
  adminUpdateLogisticsStatus,
};
