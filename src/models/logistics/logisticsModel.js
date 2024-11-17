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

const dayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    required: true,
  },
  openingTime: {
    type: String,
    required: true,
  },
  closingTime: {
    type: String,
    required: true,
  },
});

const locationSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },

  closed: {
    type: Boolean,
    default: false,
  },
});

const logisticsSchema = mongoose.Schema(
  {
    logisticsName: {
      type: String,
      required: true,
    },
    logisticsAddress: {
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
    username: {
      type: String,
      unique: true,
    },
    wallet: walletSchema,
    officeLocations: [locationSchema],
    phoneNumber: {
      type: String,
      unique: true,
    },
    avatar: {
      type: String,
    },
    coverPhoto: {
      type: String,
    },
    slug: {
      type: String,
      unique: true,
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
    accountName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    recipientCode: {
      type: String,
    },
    numReviews: {
      type: Number,
      default: 0, // Initialize with zero reviews
    },
    bankCode: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    closed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "unverified", "suspended"],
      default: "pending",
    },
    deletedAt: { type: Date },
    schedule: [dayScheduleSchema],
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Match user entered password to hashed password in database
logisticsSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

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
    throw error;
  }
}

logisticsSchema.pre("save", async function (next) {
  if (
    !this.isModified("password") &&
    !(this.isModified("accountNumber") || this.isModified("bankCode"))
  ) {
    return next();
  }

  if (this.isNew || !this.wallet) {
    this.wallet = {
      temporaryBalance: 0,
      finalBalance: 0,
    };
  }

  try {
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified("accountNumber") || this.isModified("bankCode")) {
      const recipientCode = await generateRecipientCode(
        this.accountNumber,
        this.bankCode,
        this.accountName
      );

      this.recipientCode = recipientCode;
    }

    return next();
  } catch (err) {
    return next(err);
  }
});

const Logistics = mongoose.model("Logistics", logisticsSchema);

export default Logistics;
