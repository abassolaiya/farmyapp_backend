import axios from "axios";
import User from "../models/buyer/userModel.js";
import Store from "../models/stores/sellerModel.js";
import Farm from "../models/farms/farmerModel.js";
import Transaction from "../models/transactionModel.js";
import Logistics from "../models/logistics/logisticsModel.js";
import Company from "../models/company/company.js";
import asyncHandler from "express-async-handler";
const depositMoney = async (req, res) => {
  try {
    const { user, userType } = req;
    const { amount } = req.body;

    let userModel;

    switch (userType) {
      case "user":
        userModel = await User.findById(user._id);
        break;
      case "store":
        userModel = await Store.findById(user._id);
        break;
      case "farmer":
        userModel = await Farm.findById(user._id);
        break;
      case "logistics":
        userModel = await Logistics.findById(user._id);
        break;
      case "company":
        userModel = await Company.findById(user._id);
        break;
      default:
        return res.status(400).json({ error: "Invalid user type" });
    }

    if (!userModel) {
      return res.status(404).json({ error: "User not found" });
    }

    userModel.wallet.finalBalance += Number(amount);
    await userModel.save();

    res.json({ message: "Amount deposited successfully", user: userModel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error depositing money" });
  }
};

const initiateTransfer = async (amount, recipientCode) => {
  try {
    const paystackApiUrl = "https://api.paystack.co/transfer";
    const secretKey = process.env.PAY_STACK_SECRET_KEY;

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    };

    const transferData = {
      source: "balance",
      amount: amount * 100,
      recipient: recipientCode,
      reason: "Withdrawal from platform",
    };

    const response = await axios.post(paystackApiUrl, transferData, {
      headers,
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

const withdrawMoney = async (req, res) => {
  try {
    const { user, userType } = req;
    const { amount } = req.body;

    let userModel;

    switch (userType) {
      case "user":
        userModel = await User.findById(user._id);
        break;
      case "store":
        userModel = await Store.findById(user._id);
        break;
      case "farmer":
        userModel = await Farm.findById(user._id);
        break;
      case "logistics":
        userModel = await Logistics.findById(user._id);
        break;
        case "company":
          userModel = await Company.findById(user._id);
          break;
      default:
        return res.status(400).json({ error: "Invalid user type" });
    }

    if (!userModel) {
      return res.status(404).json({ error: "User not found" });
    }

    if (amount > userModel.wallet.finalBalance) {
      return res
        .status(400)
        .json({ message: "Withdrawal amount exceeds balance" });
    }
    const recipientCode = userModel.recipientCode;
    const transferResult = await initiateTransfer(amount, recipientCode);

    const withdrawalTransaction = new Transaction({
      user: userModel._id,
      userType: userType,
      entity: userType,
      entityID: userModel._id,
      amount: -amount,
      type: "withdrawal",
      status: "pending",
    });
    await withdrawalTransaction.save();

    const withdrawalResult = await transferResult;
    // console.log(transferResult.status);
    if (withdrawalResult.status) {
      userModel.wallet.finalBalance -= amount;
      await userModel.save();

      withdrawalTransaction.status = "completed";
      await withdrawalTransaction.save();

      return res.json({
        message: "Withdrawal successful",
        user: userModel,
        transferResult,
      });
    } else {
      // Revert the pending transaction
      withdrawalTransaction.status = "failed";
      await withdrawalTransaction.save();

      return res.status(400).json({ error: "Withdrawal failed" });
    }
    return res.status(200).json({
      message: "Withdrawal successful",
      user: userModel,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error withdrawing money" });
  }
};

const getUser = asyncHandler(async (req, res) => {
  // Get the user ID from the request parameters
  const userId = req.params.id;

  // Define model names in an array
  const userModels = ["Farm", "Store", "Logistics", "User", "Company"];

  // Loop through each model
  for (const userModel of userModels) {
    try {
      // Try to find the user in the current model
      const user = await mongoose.model(userModel).findById(userId);

      // If found, return the user information
      if (user) {
        return res.json({ user });
      }
    } catch (error) {
      // Handle any errors for the current model
      console.error(`Error fetching user from ${userModel}: ${error}`);
    }
  }

  // No user found in any model
  return res.status(404).json({ message: "User not found." });
});

const getBanks = asyncHandler(async (req, res) => {
  try {
    const secretKey = process.env.PAY_STACK_SECRET_KEY;
    // const { currency } = req.query;
    const currency = "NGN";

    const response = await axios.get(
      `https://api.paystack.co/bank?currency=${currency}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { depositMoney, withdrawMoney, getUser, getBanks };
