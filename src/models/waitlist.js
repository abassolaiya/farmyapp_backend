import mongoose from "mongoose";

const waitlistSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    city: {
      type: String,
    },
    role: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Waitlist = mongoose.model("Waitlist", waitlistSchema);

export default Waitlist;
