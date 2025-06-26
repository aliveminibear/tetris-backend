const express = require("express");
const router = express.Router();

// Mock scores data
const scores = [
  { id: 1, userId: 1, gameId: 1, score: 2450, date: "2024-01-20T10:30:00Z" },
  { id: 2, userId: 1, gameId: 2, score: 1800, date: "2024-01-19T15:45:00Z" },
];

// Submit a new score
router.post("/", (req, res) => {
  try {
    const { userId, gameId, score } = req.body;

    if (!userId || !gameId || !score) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const newScore = {
      id: scores.length + 1,
      userId: parseInt(userId),
      gameId: parseInt(gameId),
      score: parseInt(score),
      date: new Date().toISOString(),
    };

    scores.push(newScore);

    res.json({
      success: true,
      data: newScore,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to submit score",
    });
  }
});

module.exports = router;
