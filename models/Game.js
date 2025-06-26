const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  players: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      avatar: String,
      eloBefore: { type: Number, default: 1200 },
      eloAfter: { type: Number, default: 1200 },
    },
  ],
  winner: { type: String, default: null },
  loser: { type: String, default: null },
  gameType: { type: String, default: "tetris" },
  status: {
    type: String,
    enum: ["active", "finished", "abandoned"],
    default: "active",
  },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // in seconds
  rematchRequests: [
    {
      playerId: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      accepted: { type: Boolean, default: false },
    },
  ],
  rematchGameId: { type: String, default: null }, // ID of the rematch game
  originalGameId: { type: String, default: null }, // ID of the original game if this is a rematch
  gameData: { type: mongoose.Schema.Types.Mixed, default: {} }, // Store game-specific data
});

// Index for efficient querying (removed duplicate gameId index)
gameSchema.index({ "players.id": 1 });
gameSchema.index({ startTime: -1 });
gameSchema.index({ status: 1 });

module.exports = mongoose.model("Game", gameSchema);
