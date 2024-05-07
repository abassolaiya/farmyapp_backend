import mongoose from 'mongoose';

const expoPushTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userType: { type: String, enum: ['farmer', 'store', 'logistics', 'company', 'user'] },
  expoPushTokens: [{ type: String }]
});

const ExpoPushToken = mongoose.model('ExpoPushToken', expoPushTokenSchema);

export default ExpoPushToken;
