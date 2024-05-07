import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import axios from "axios";

const walletSchema = mongoose.Schema({
  totalCommission: {
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
});

const companySchema = mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    companyAddress: {
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
    companyLocations: [locationSchema],
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
  },
  {
    timestamps: true,
  }
);

companySchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

companySchema.pre("save", async function (next) {
  if (!this.isModified("password") && !(this.isModified("accountNumber") || this.isModified("bankCode"))) {
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

// companySchema.pre("save", async function (next) {
//   if (this.isModified("accountNumber") || this.isModified("bankCode")) {
//     try {
//       const recipientCode = await generateRecipientCode(
//         this.accountNumber,
//         this.bankCode,
//         this.accountName
//       );

//       this.recipientCode = recipientCode;

//       next();
//     } catch (err) {
//       console.log(err);
//       next(err);
//     }
//   } else {
//     next();
//   }
// });

const Company = mongoose.model("company", companySchema);

export default Company;
