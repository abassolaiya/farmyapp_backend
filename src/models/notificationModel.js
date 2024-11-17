import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userType: {
      type: String,
      // required: true,
    },
    link: {
      type: String,
    },
    status: {
      type: String,
      enum: ["read", "unread"],
      default: "unread",
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
