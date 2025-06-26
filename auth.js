const { OAuth2Client } = require("google-auth-library");
const User = require("./models/User");
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ googleId: payload.sub });

    if (!user) {
      // Check if user exists with same email but different auth method
      const existingUser = await User.findOne({ email: payload.email });
      if (existingUser) {
        // Link Google account to existing user
        existingUser.googleId = payload.sub;
        existingUser.authMethod = "google";
        existingUser.name = payload.name;
        existingUser.avatar = payload.picture;
        existingUser.lastLogin = new Date();
        existingUser.lastActivity = new Date();
        user = await existingUser.save();
      } else {
        // Create new user
        user = await User.create({
          googleId: payload.sub,
          name: payload.name,
          email: payload.email,
          avatar: payload.picture,
          authMethod: "google",
          eloRating: 1200,
          rank: "Bronze",
          wins: 0,
          losses: 0,
          draws: 0,
          totalGames: 0,
          level: 1,
          experience: 0,
          winStreak: 0,
          bestWinStreak: 0,
          lastActivity: new Date(),
          preferences: {
            theme: "dark",
            soundEnabled: true,
            notificationsEnabled: true,
          },
        });
      }
    } else {
      // Update existing user's info
      user.name = payload.name;
      user.email = payload.email;
      user.avatar = payload.picture;
      user.lastLogin = new Date();
      user.lastActivity = new Date();
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, googleId: user.googleId },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user._id,
        googleId: user.googleId,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        customAvatar: user.customAvatar,
        eloRating: user.eloRating,
        rank: user.rank,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        totalGames: user.totalGames,
        level: user.level,
        experience: user.experience,
        winStreak: user.winStreak,
        bestWinStreak: user.bestWinStreak,
        preferences: user.preferences,
      },
      token,
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    // Update user's last activity
    await User.findByIdAndUpdate(user.userId, {
      lastActivity: new Date(),
    });

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        googleId: user.googleId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        customAvatar: user.customAvatar,
        eloRating: user.eloRating,
        rank: user.rank,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        totalGames: user.totalGames,
        level: user.level,
        experience: user.experience,
        winStreak: user.winStreak,
        bestWinStreak: user.bestWinStreak,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user preferences
router.put("/preferences", authenticateToken, async (req, res) => {
  try {
    const { theme, soundEnabled, notificationsEnabled } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.preferences = {
      theme: theme || user.preferences.theme,
      soundEnabled:
        soundEnabled !== undefined
          ? soundEnabled
          : user.preferences.soundEnabled,
      notificationsEnabled:
        notificationsEnabled !== undefined
          ? notificationsEnabled
          : user.preferences.notificationsEnabled,
    };

    await user.save();
    res.json({ preferences: user.preferences });
  } catch (err) {
    console.error("Update preferences error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Password-based registration
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists with this email or username" });
    }

    // Create new user with password
    const user = await User.create({
      username,
      email,
      password, // Stored as plain text as requested
      name: name || username,
      authMethod: "password",
      eloRating: 1200,
      rank: "Bronze",
      wins: 0,
      losses: 0,
      draws: 0,
      totalGames: 0,
      level: 1,
      experience: 0,
      winStreak: 0,
      bestWinStreak: 0,
      preferences: {
        theme: "dark",
        soundEnabled: true,
        notificationsEnabled: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        customAvatar: user.customAvatar,
        eloRating: user.eloRating,
        rank: user.rank,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        totalGames: user.totalGames,
        level: user.level,
        experience: user.experience,
        winStreak: user.winStreak,
        bestWinStreak: user.bestWinStreak,
        preferences: user.preferences,
      },
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Password-based login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        customAvatar: user.customAvatar,
        eloRating: user.eloRating,
        rank: user.rank,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        totalGames: user.totalGames,
        level: user.level,
        experience: user.experience,
        winStreak: user.winStreak,
        bestWinStreak: user.bestWinStreak,
        preferences: user.preferences,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout route
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can add any server-side cleanup here if needed
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

module.exports = { router, authenticateToken };
