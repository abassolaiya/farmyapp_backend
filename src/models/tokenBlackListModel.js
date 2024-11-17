import mongoose from "mongoose";

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Set the expiration time for the document (in seconds)
  },
});

const TokenBlacklist = mongoose.model("TokenBlacklist", tokenBlacklistSchema);

export default TokenBlacklist;
