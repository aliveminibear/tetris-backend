const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticateToken } = require("../auth");

// Mock user data
const users = [
  {
    id: 1,
    username: "GamePlayer123",
    avatar: "🎮",
    level: 15,
    title: "Game Master",
    joinDate: "2024-01-15",
    totalScore: 12540,
    gamesPlayed: 89,
    winRate: 67,
    rank: 42,
    email: "player@example.com",
  },
];

// Get current user profile (for authenticated users)
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = {
      _id: user._id,
      name: user.name,
      avatar: user.avatar || "/api/avatars/default",
      customAvatar: user.customAvatar,
      level: user.level || 1,
      rank: user.rank || "Bronze",
      eloRating: user.eloRating || 1200,
      wins: user.wins || 0,
      losses: user.losses || 0,
      totalGames: user.totalGames || 0,
      experience: user.experience || 0,
      winStreak: user.winStreak || 0,
      createdAt: user.createdAt || new Date(),
      email: user.email,
    };

    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Get user profile by ID
router.get("/profile/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile",
    });
  }
});

// Update user profile
router.put("/profile/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const updates = req.body;

    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Update user data
    users[userIndex] = { ...users[userIndex], ...updates };

    res.json({
      success: true,
      data: users[userIndex],
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update user profile",
    });
  }
});

// Get user statistics
router.get("/:userId/stats", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Mock detailed statistics
    const stats = {
      totalScore: user.totalScore,
      gamesPlayed: user.gamesPlayed,
      winRate: user.winRate,
      averageScore: Math.floor(user.totalScore / user.gamesPlayed),
      bestGame: "Snake Game",
      bestScore: 2450,
      totalPlayTime: "45h 23m",
      achievements: 8,
      rank: user.rank,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch user statistics",
    });
  }
});

module.exports = router;
