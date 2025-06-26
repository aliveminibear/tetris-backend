const express = require("express");
const router = express.Router();
const Game = require("../models/Game");
const User = require("../models/User");
const { authenticateToken } = require("../auth");

// Request a rematch
router.post("/request/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Check if player was part of the game
    const playerInGame = game.players.find((p) => p.id === playerId);
    if (!playerInGame) {
      return res.status(403).json({ error: "Player not part of this game" });
    }

    // Check if rematch already requested
    const existingRequest = game.rematchRequests.find(
      (r) => r.playerId === playerId
    );
    if (existingRequest) {
      return res.status(400).json({ error: "Rematch already requested" });
    }

    game.rematchRequests.push({
      playerId,
      timestamp: new Date(),
      accepted: false,
    });

    await game.save();

    res.json({ message: "Rematch requested successfully" });
  } catch (error) {
    console.error("Error requesting rematch:", error);
    res.status(500).json({ error: "Failed to request rematch" });
  }
});

// Accept a rematch
router.post("/accept/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Find and accept the rematch request
    const request = game.rematchRequests.find(
      (r) => r.playerId !== playerId && !r.accepted
    );
    if (!request) {
      return res.status(400).json({ error: "No pending rematch request" });
    }

    request.accepted = true;
    await game.save();

    // Create new game for rematch
    const rematchGameId = `${gameId}-rematch-${Date.now()}`;
    const rematchGame = new Game({
      gameId: rematchGameId,
      players: game.players,
      gameType: game.gameType,
      originalGameId: gameId,
    });

    await rematchGame.save();

    res.json({
      message: "Rematch accepted",
      rematchGameId,
      players: game.players,
    });
  } catch (error) {
    console.error("Error accepting rematch:", error);
    res.status(500).json({ error: "Failed to accept rematch" });
  }
});

// Get game history for a player
router.get("/history/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    // Try to find games for the player
    const games = await Game.find({
      "players.id": playerId,
      status: "finished",
    })
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("players", "name avatar");

    const total = await Game.countDocuments({
      "players.id": playerId,
      status: "finished",
    });

    // If no games found, return empty array instead of error
    res.json({
      games: games || [],
      total: total || 0,
      page: parseInt(page),
      totalPages: Math.ceil((total || 0) / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching game history:", error);
    // Return empty result instead of error
    res.json({
      games: [],
      total: 0,
      page: parseInt(req.query.page) || 1,
      totalPages: 0,
    });
  }
});

// Get recent games between two players
router.get("/recent/:player1Id/:player2Id", async (req, res) => {
  try {
    const { player1Id, player2Id } = req.params;

    const games = await Game.find({
      "players.id": { $all: [player1Id, player2Id] },
      status: "finished",
    })
      .sort({ startTime: -1 })
      .limit(5);

    res.json({ games });
  } catch (error) {
    console.error("Error fetching recent games:", error);
    res.status(500).json({ error: "Failed to fetch recent games" });
  }
});

module.exports = router;
