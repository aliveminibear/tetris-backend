const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  gameId: { type: String, required: true },
  sender: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
  },
  message: { type: String, required: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ["chat", "system", "rematch"], default: "chat" },
});

const chatSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  messages: [chatMessageSchema],
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
});

// Index for efficient querying (removed duplicate gameId index)
chatSchema.index({ "messages.timestamp": -1 });

module.exports = mongoose.model("Chat", chatSchema);
