import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId }],
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId },
      message: String,
      image: String,
      timestamp: { type: Date, default: Date.now },
      readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
  ],
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;