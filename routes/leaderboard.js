const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Mock leaderboard data
const leaderboardData = {
  overall: [
    {
      id: 1,
      name: "GameMaster",
      score: 15420,
      avatar: "👑",
      gamesPlayed: 156,
      rank: 1,
    },
    {
      id: 2,
      name: "SpeedRunner",
      score: 12850,
      avatar: "⚡",
      gamesPlayed: 134,
      rank: 2,
    },
    {
      id: 3,
      name: "PuzzleSolver",
      score: 11230,
      avatar: "🧩",
      gamesPlayed: 98,
      rank: 3,
    },
    {
      id: 4,
      name: "LuckyPlayer",
      score: 9870,
      avatar: "🍀",
      gamesPlayed: 87,
      rank: 4,
    },
    {
      id: 5,
      name: "StrategyKing",
      score: 8540,
      avatar: "♟️",
      gamesPlayed: 76,
      rank: 5,
    },
  ],
};

// Get leaderboard by type
router.get("/:type", (req, res) => {
  try {
    const type = req.params.type;
    const limit = parseInt(req.query.limit) || 10;

    if (!leaderboardData[type]) {
      return res.status(400).json({
        success: false,
        error: "Invalid leaderboard type",
      });
    }

    const leaderboard = leaderboardData[type].slice(0, limit);

    res.json({
      success: true,
      data: {
        type: type,
        leaderboard: leaderboard,
        totalPlayers: leaderboardData[type].length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard",
    });
  }
});

// GET /api/leaderboard
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .sort({ wins: -1, level: -1 })
      .limit(20)
      .select("name avatar wins losses level");
    res.json({ players: users });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// GET /api/leaderboard/advanced - Advanced ranking with ELO and detailed stats
router.get("/advanced", async (req, res) => {
  try {
    const users = await User.find()
      .sort({ eloRating: -1, experience: -1 })
      .select(
        "name avatar customAvatar wins losses draws level experience eloRating rank totalGames winStreak bestWinStreak lastGameDate"
      );

    res.json({ players: users });
  } catch (error) {
    console.error("Error fetching advanced leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch advanced leaderboard" });
  }
});

module.exports = router;
