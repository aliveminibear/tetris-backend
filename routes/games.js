const express = require("express");
const router = express.Router();

// Mock data for games
const games = [
  {
    id: 1,
    name: "Snake Game",
    description: "Classic snake game with modern graphics",
    icon: "🐍",
    players: 156,
    rating: 4.5,
    category: "arcade",
    difficulty: "medium",
    instructions:
      "Use arrow keys to control the snake. Eat food to grow and avoid hitting walls or yourself.",
    highScore: 15420,
  },
  {
    id: 2,
    name: "Memory Match",
    description: "Test your memory with card matching",
    icon: "🧠",
    players: 89,
    rating: 4.2,
    category: "puzzle",
    difficulty: "easy",
    instructions:
      "Find matching pairs of cards. Remember their positions to complete the game quickly.",
    highScore: 12850,
  },
  {
    id: 3,
    name: "Tic Tac Toe",
    description: "Play against AI or friends",
    icon: "⭕",
    players: 234,
    rating: 4.0,
    category: "strategy",
    difficulty: "easy",
    instructions:
      "Get three of your marks in a row to win. Play against AI or challenge friends.",
    highScore: 11230,
  },
  {
    id: 4,
    name: "Color Rush",
    description: "Quick reflexes color matching game",
    icon: "🎨",
    players: 67,
    rating: 4.7,
    category: "arcade",
    difficulty: "hard",
    instructions:
      "Match the color shown on screen as quickly as possible. Speed is key!",
    highScore: 9870,
  },
  {
    id: 5,
    name: "Word Puzzle",
    description: "Solve word puzzles and expand vocabulary",
    icon: "📝",
    players: 123,
    rating: 4.3,
    category: "puzzle",
    difficulty: "medium",
    instructions:
      "Unscramble letters to form words. Complete all levels to win.",
    highScore: 8540,
  },
];

// Get all games
router.get("/", (req, res) => {
  try {
    res.json({
      success: true,
      data: games,
      count: games.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch games",
    });
  }
});

// Get game by ID
router.get("/:id", (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const game = games.find((g) => g.id === gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: "Game not found",
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch game",
    });
  }
});

// Get games by category
router.get("/category/:category", (req, res) => {
  try {
    const category = req.params.category;
    const filteredGames = games.filter((g) => g.category === category);

    res.json({
      success: true,
      data: filteredGames,
      count: filteredGames.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch games by category",
    });
  }
});

// Get popular games (sorted by players)
router.get("/popular/top", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const popularGames = [...games]
      .sort((a, b) => b.players - a.players)
      .slice(0, limit);

    res.json({
      success: true,
      data: popularGames,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch popular games",
    });
  }
});

// Get game statistics
router.get("/:id/stats", (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const game = games.find((g) => g.id === gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: "Game not found",
      });
    }

    // Mock statistics
    const stats = {
      totalPlays: Math.floor(Math.random() * 10000) + 1000,
      averageScore: Math.floor(Math.random() * 1000) + 500,
      completionRate: Math.floor(Math.random() * 30) + 70,
      averageTime: Math.floor(Math.random() * 300) + 60,
      dailyActivePlayers: Math.floor(Math.random() * 100) + 10,
    };

    res.json({
      success: true,
      data: {
        game: game,
        stats: stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch game statistics",
    });
  }
});

// Start a new game session
router.post("/:id/start", (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const game = games.find((g) => g.id === gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: "Game not found",
      });
    }

    // Generate a unique session ID
    const sessionId = `game_${gameId}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        game: game,
        startTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to start game session",
    });
  }
});

module.exports = router;
