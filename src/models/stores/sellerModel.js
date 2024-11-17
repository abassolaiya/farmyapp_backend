import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import axios from "axios";

const walletSchema = mongoose.Schema({
  temporaryBalance: {
    type: Number,
    default: 0,
    required: true,
  },
  finalBalance: {
    type: Number,
    default: 0,
    required: true,
  },
});

const storeHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
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

const storeSchema = mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
    },
    storeAddress: {
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
    storeLocations: [locationSchema],
    storeHours: [storeHoursSchema],
    username: {
      type: String,
      unique: true,
    },
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    verificationCode: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "unverified", "suspended"],
      default: "pending", // Default status can be set as needed
    },
    slug: {
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
      type: String,
    },
    password: {
      type: String,
      required: true,
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
    bankName: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: { type: Date },
    closed: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// storeSchema.index({ location: "2dsphere" });

// Match user entered password to hashed password in database
storeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
storeSchema.pre("save", async function (next) {
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

const Store = mongoose.model("Store", storeSchema);

export default Store;
