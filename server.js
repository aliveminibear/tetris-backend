const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();
const { router: authRoutes, authenticateToken } = require("./auth");
const User = require("./models/User");
const Game = require("./models/Game");
const Chat = require("./models/Chat");

const app = express();
const server = http.createServer(app);

// Configure CORS for production
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? [process.env.FRONTEND_URL, "https://your-domain.com"]
      : "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const io = socketIo(server, {
  cors: corsOptions,
});

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for development
  })
);
app.use(cors(corsOptions));
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve avatars API and static avatar images
app.use("/api/avatars", require("./routes/avatars"));
app.use(
  "/assets/avatars",
  express.static(path.join(__dirname, "assets/avatars"))
);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// MongoDB connection
const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tetris-arena";
mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/games", require("./routes/games"));
app.use("/api/leaderboard", require("./routes/leaderboard"));
app.use("/api/users", require("./routes/users"));
app.use("/api/scores", require("./routes/scores"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/rematch", require("./routes/rematch"));
app.use("/api/auth", authRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Tetris Arena API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Site statistics endpoint
app.get("/api/stats", async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments();

    // Get users who played in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      lastGameDate: { $gte: yesterday },
    });

    // Get total games played today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalGamesToday = await Game.countDocuments({
      startTime: { $gte: today },
    });

    // Calculate average ELO
    const usersWithElo = await User.find({
      eloRating: { $exists: true, $ne: null },
    });
    const avgElo =
      usersWithElo.length > 0
        ? Math.round(
            usersWithElo.reduce(
              (sum, user) => sum + (user.eloRating || 1200),
              0
            ) / usersWithElo.length
          )
        : 1200;

    // Estimate online players (users active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlinePlayers = await User.countDocuments({
      lastActivity: { $gte: fiveMinutesAgo },
    });

    res.json({
      activePlayers: activeUsers,
      totalGames: totalGamesToday,
      avgElo: avgElo,
      onlinePlayers: onlinePlayers,
      totalUsers: totalUsers,
    });
  } catch (error) {
    console.error("Error fetching site stats:", error);
    res.status(500).json({
      error: "Failed to fetch site statistics",
      // Fallback data
      activePlayers: 0,
      totalGames: 0,
      avgElo: 1200,
      onlinePlayers: 0,
      totalUsers: 0,
    });
  }
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// Tetris multiplayer matchmaking and game session logic
const waitingPlayers = [];
const activeGames = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("find-match", async (user) => {
    socket.user = user;

    // Check if user is already waiting
    const alreadyWaiting = waitingPlayers.find((p) => p.user.id === user.id);
    if (alreadyWaiting) {
      socket.emit("error", { message: "You are already in queue" });
      return;
    }

    if (waitingPlayers.length > 0) {
      const opponentSocket = waitingPlayers.shift();
      const gameId = `${socket.id}-${opponentSocket.id}-${Date.now()}`;

      // Create game record
      const game = new Game({
        gameId,
        players: [
          {
            id: user.id,
            name: user.name,
            avatar: user.customAvatar || user.avatar,
            eloBefore: user.eloRating || 1200,
          },
          {
            id: opponentSocket.user.id,
            name: opponentSocket.user.name,
            avatar:
              opponentSocket.user.customAvatar || opponentSocket.user.avatar,
            eloBefore: opponentSocket.user.eloRating || 1200,
          },
        ],
        gameType: "tetris",
        status: "active",
        startTime: new Date(),
      });

      await game.save();

      activeGames[gameId] = {
        players: [socket, opponentSocket],
        status: "playing",
        gameRecord: game,
        gameData: {
          player1: { score: 0, lines: 0, board: [] },
          player2: { score: 0, lines: 0, board: [] },
        },
      };

      socket.join(gameId);
      opponentSocket.join(gameId);

      // Create chat room
      const chat = new Chat({ gameId });
      await chat.save();

      // Notify both players
      io.to(gameId).emit("match-found", {
        gameId,
        players: [user, opponentSocket.user],
      });

      // Start game after 3 seconds
      setTimeout(() => {
        io.to(gameId).emit("game-start");
      }, 3000);
    } else {
      waitingPlayers.push(socket);
      socket.emit("waiting-for-opponent");
    }
  });

  socket.on("cancel-match", () => {
    const index = waitingPlayers.findIndex((p) => p.id === socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }
    socket.emit("match-cancelled");
  });

  socket.on("game-update", (data) => {
    const { gameId, type, board, score, lines } = data;
    if (!gameId || !socket.user) return;

    const game = activeGames[gameId];
    if (!game) return;

    // Update game data
    const playerIndex = game.players.findIndex(
      (p) => p.user.id === socket.user.id
    );
    if (playerIndex !== -1) {
      if (type === "board") {
        game.gameData[playerIndex === 0 ? "player1" : "player2"].board = board;
      } else if (type === "score") {
        game.gameData[playerIndex === 0 ? "player1" : "player2"].score = score;
        game.gameData[playerIndex === 0 ? "player1" : "player2"].lines = lines;
      }
    }

    // Send update to opponent
    socket.to(gameId).emit("game-update", {
      type,
      board,
      score,
      lines,
      playerId: socket.user.id,
    });
  });

  socket.on("chat-message", async (data) => {
    try {
      const { gameId, message } = data;
      if (!gameId || !message || !socket.user) return;

      const chatMessage = {
        id: Date.now(),
        gameId,
        sender: {
          id: socket.user.id,
          name: socket.user.name,
          avatar: socket.user.customAvatar || socket.user.avatar,
        },
        message: message.trim(),
        type: "chat",
        timestamp: new Date(),
      };

      let chat = await Chat.findOne({ gameId });
      if (!chat) {
        chat = new Chat({ gameId });
      }

      chat.messages.push(chatMessage);
      chat.lastActivity = new Date();
      await chat.save();

      io.to(gameId).emit("chat-message", chatMessage);
    } catch (error) {
      console.error("Error handling chat message:", error);
    }
  });

  socket.on("game-over", async (data) => {
    const { gameId, winner, loser, finalScore, linesCleared } = data;

    if (!activeGames[gameId]) return;

    const game = activeGames[gameId].gameRecord;
    if (!game) return;

    try {
      // Update game record
      game.status = "finished";
      game.winner = winner.id;
      game.loser = loser.id;
      game.endTime = new Date();
      game.duration = game.endTime - game.startTime;
      game.finalScores = {
        winner: { score: finalScore, lines: linesCleared },
        loser: { score: 0, lines: 0 },
      };

      await game.save();

      // Update player statistics
      const winnerUser = await User.findById(winner.id);
      const loserUser = await User.findById(loser.id);

      if (winnerUser && loserUser) {
        // Calculate ELO changes
        const kFactor = 32;
        const expectedWinner =
          1 /
          (1 +
            Math.pow(10, (loserUser.eloRating - winnerUser.eloRating) / 400));
        const expectedLoser =
          1 /
          (1 +
            Math.pow(10, (winnerUser.eloRating - loserUser.eloRating) / 400));

        const eloChange = Math.round(kFactor * (1 - expectedWinner));

        // Update winner
        winnerUser.wins++;
        winnerUser.totalGames++;
        winnerUser.eloRating += eloChange;
        winnerUser.winStreak++;
        if (winnerUser.winStreak > winnerUser.bestWinStreak) {
          winnerUser.bestWinStreak = winnerUser.winStreak;
        }
        winnerUser.rank = winnerUser.calculateRank();
        await winnerUser.save();

        // Update loser
        loserUser.losses++;
        loserUser.totalGames++;
        loserUser.eloRating -= eloChange;
        loserUser.winStreak = 0;
        loserUser.rank = loserUser.calculateRank();
        await loserUser.save();

        // Notify players
        io.to(gameId).emit("game-over", {
          winner: {
            id: winner.id,
            name: winner.name,
            eloChange: eloChange,
          },
          loser: {
            id: loser.id,
            name: loser.name,
            eloChange: -eloChange,
          },
          finalScore,
          linesCleared,
        });
      }

      // Clean up
      delete activeGames[gameId];
    } catch (error) {
      console.error("Error handling game over:", error);
    }
  });

  socket.on("forfeit", async (data) => {
    const { gameId } = data;
    if (!activeGames[gameId]) return;

    const game = activeGames[gameId];
    const opponent = game.players.find((p) => p.id !== socket.id);

    if (opponent) {
      socket.to(gameId).emit("opponent-forfeited", {
        playerName: socket.user.name,
      });
    }
  });

  socket.on("rematch-request", async (data) => {
    const { gameId } = data;
    if (!gameId || !socket.user) return;

    try {
      const game = await Game.findOne({ gameId });
      if (!game) return;

      // Check if rematch already requested
      const existingRequest = game.rematchRequests.find(
        (r) => r.playerId === socket.user.id
      );

      if (!existingRequest) {
        game.rematchRequests.push({
          playerId: socket.user.id,
          timestamp: new Date(),
          accepted: false,
        });
        await game.save();
      }

      io.to(gameId).emit("rematch-requested", {
        playerId: socket.user.id,
        playerName: socket.user.name,
      });
    } catch (error) {
      console.error("Error handling rematch request:", error);
    }
  });

  socket.on("rematch-accept", async (data) => {
    const { gameId } = data;
    if (!gameId || !socket.user) return;

    try {
      const game = await Game.findOne({ gameId });
      if (!game) return;

      // Find and accept the rematch request
      const request = game.rematchRequests.find(
        (r) => r.playerId !== socket.user.id && !r.accepted
      );

      if (request) {
        request.accepted = true;
        await game.save();

        // Create new game for rematch
        const rematchGameId = `${gameId}-rematch-${Date.now()}`;
        const rematchGame = new Game({
          gameId: rematchGameId,
          players: game.players,
          gameType: game.gameType,
          originalGameId: gameId,
          startTime: new Date(),
        });

        await rematchGame.save();

        io.to(gameId).emit("rematch-accepted", {
          rematchGameId,
          players: game.players,
        });
      }
    } catch (error) {
      console.error("Error handling rematch accept:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove from waiting queue
    const waitingIndex = waitingPlayers.findIndex((p) => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }

    // Handle disconnection from active games
    Object.keys(activeGames).forEach((gameId) => {
      const game = activeGames[gameId];
      const playerIndex = game.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        const opponent = game.players[playerIndex === 0 ? 1 : 0];
        if (opponent) {
          opponent.emit("opponent-disconnected");
        }
        delete activeGames[gameId];
      }
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Tetris Arena server running on port ${PORT}`);
});

module.exports = { app, server, io };
