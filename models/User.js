const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true, sparse: true },
  password: { type: String },
  name: String,
  email: { type: String, required: true, unique: true },
  avatar: String,
  customAvatar: {
    type: String,
    default: null,
  },
  authMethod: { type: String, enum: ["google", "password"], default: "google" },
  createdAt: { type: Date, default: Date.now },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  eloRating: { type: Number, default: 1200 },
  rank: { type: String, default: "Bronze" },
  totalGames: { type: Number, default: 0 },
  winStreak: { type: Number, default: 0 },
  bestWinStreak: { type: Number, default: 0 },
  lastGameDate: { type: Date, default: null },
  lastActivity: { type: Date, default: Date.now },
  preferences: {
    theme: { type: String, default: "default" },
    soundEnabled: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
  },
});

// Calculate rank based on ELO rating
userSchema.methods.calculateRank = function () {
  if (this.eloRating >= 2000) return "Diamond";
  if (this.eloRating >= 1800) return "Platinum";
  if (this.eloRating >= 1600) return "Gold";
  if (this.eloRating >= 1400) return "Silver";
  return "Bronze";
};

// Update ELO rating after a game
userSchema.methods.updateElo = function (opponentElo, result, kFactor = 32) {
  const expectedScore =
    1 / (1 + Math.pow(10, (opponentElo - this.eloRating) / 400));
  const actualScore = result; // 1 for win, 0.5 for draw, 0 for loss
  this.eloRating = Math.round(
    this.eloRating + kFactor * (actualScore - expectedScore)
  );
  this.rank = this.calculateRank();
};

module.exports = mongoose.model("User", userSchema);
