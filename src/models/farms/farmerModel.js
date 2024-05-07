import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import axios from "axios";

const walletSchema = mongoose.Schema({
  temporaryBalance: {
    type: Number,
    default: 0,
  },
  finalBalance: {
    type: Number,
    default: 0,
  },
});

const farmSchema = mongoose.Schema(
  {
    farmName: {
      type: String,
      required: true,
    },
    farmAddress: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    wallet: walletSchema,
    username: {
      type: String,
      unique: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
    },
    avatar: {
      type: String,
    },
    coverPhoto: {
      type: String
    },
    password: {
      type: String,
      required: true,
    },
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    verificationCode: {
      type: String,
    },
    bankCode: {
      type: String,
    },
    accountName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    recipientCode: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Match user entered password to hashed password in database
farmSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

farmSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Hash the password only if it's modified or new
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // Generate recipient code if accountNumber or bankCode is modified
  if (this.isModified("accountNumber") || this.isModified("bankCode")) {
    try {
      const recipientCode = await generateRecipientCode(
        this.accountNumber,
        this.bankCode,
        this.accountName
      );

      this.recipientCode = recipientCode;
    } catch (err) {
      console.log(err);
      return next(err);
    }
  }

  next();
});

async function generateRecipientCode(accountNumber, bankCode, accountName) {
  const secretKey = process.env.PAY_STACK_SECRET_KEY;
  const url = "https://api.paystack.co/transferrecipient";

  try {
    const response = await axios.post(
      url,
      {
        type: "nuban",
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const recipientCode = response.data.data.recipient_code;
    return recipientCode;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

const Farm = mongoose.model("Farm", farmSchema);

export default Farm;
