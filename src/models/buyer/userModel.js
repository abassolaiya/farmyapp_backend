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

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      unique: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
    },
    wallet: walletSchema,
    avatar: {
      type: String,
    },
    coverPhoto: {
      type: String,
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
    bankName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    recipientCode: {
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
    status: {
      // Add status field
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // If 'isNew' or 'wallet' field is not available, set default values
  if (this.isNew || !this.wallet) {
    this.wallet = {
      temporaryBalance: 0,
      finalBalance: 0,
    };
  }

  // Handle the 'generateRecipientCode' logic here
  if (this.isModified("accountNumber") || this.isModified("bankCode")) {
    try {
      const recipientCode = await generateRecipientCode(
        this.accountNumber,
        this.bankCode,
        this.name
      );
      this.recipientCode = recipientCode;
    } catch (err) {
      return next(err);
    }
  }

  next();
});

// Function to generate recipient code
async function generateRecipientCode(accountNumber, bankCode, accountName) {
  try {
    const secretKey = process.env.PAY_STACK_SECRET_KEY;
    const url = "https://api.paystack.co/transferrecipient";

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

    return response.data.data.recipient_code;
  } catch (error) {
    throw error;
  }
}

const User = mongoose.model("User", userSchema);

export default User;
