const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { authenticateToken } = require("../auth");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Get available avatar options
router.get("/options", async (req, res) => {
  try {
    const avatarOptions = [
      { id: "default", name: "Default", url: "/api/avatars/default" },
      { id: "robot", name: "Robot", url: "/api/avatars/robot" },
      { id: "ninja", name: "Ninja", url: "/api/avatars/ninja" },
      { id: "wizard", name: "Wizard", url: "/api/avatars/wizard" },
      { id: "knight", name: "Knight", url: "/api/avatars/knight" },
      { id: "archer", name: "Archer", url: "/api/avatars/archer" },
    ];

    res.json({ avatars: avatarOptions });
  } catch (error) {
    console.error("Error fetching avatar options:", error);
    res.status(500).json({ error: "Failed to fetch avatar options" });
  }
});

// Upload custom avatar
router.post(
  "/upload",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const avatarUrl = `/api/avatars/custom/${req.file.filename}`;

      // Update user's custom avatar
      await User.findByIdAndUpdate(req.user.userId, {
        customAvatar: avatarUrl,
      });

      res.json({
        message: "Avatar uploaded successfully",
        avatarUrl,
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  }
);

// Set predefined avatar
router.post("/set/:avatarId", authenticateToken, async (req, res) => {
  try {
    const { avatarId } = req.params;
    const validAvatars = [
      "default",
      "robot",
      "ninja",
      "wizard",
      "knight",
      "archer",
    ];

    if (!validAvatars.includes(avatarId)) {
      return res.status(400).json({ error: "Invalid avatar selection" });
    }

    const avatarUrl = `/api/avatars/${avatarId}`;

    await User.findByIdAndUpdate(req.user.userId, {
      customAvatar: avatarUrl,
    });

    res.json({
      message: "Avatar updated successfully",
      avatarUrl,
    });
  } catch (error) {
    console.error("Error setting avatar:", error);
    res.status(500).json({ error: "Failed to set avatar" });
  }
});

// Get user's current avatar
router.get("/current", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const avatarUrl =
      user.customAvatar || user.avatar || "/api/avatars/default";

    res.json({ avatarUrl });
  } catch (error) {
    console.error("Error fetching current avatar:", error);
    res.status(500).json({ error: "Failed to fetch current avatar" });
  }
});

// Serve avatar files
router.get("/custom/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "../uploads/avatars", filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Avatar not found" });
  }
});

// Serve predefined avatars
router.get("/:avatarId", (req, res) => {
  const { avatarId } = req.params;

  // Handle default avatar with emoji fallback
  if (avatarId === "default") {
    // Return a simple SVG with a default avatar icon
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#667eea"/>
      <text x="50" y="60" text-anchor="middle" fill="white" font-size="40" font-family="Arial">👤</text>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(svg);
  }

  const avatarPath = path.join(
    __dirname,
    "../assets/avatars",
    `${avatarId}.png`
  );

  if (fs.existsSync(avatarPath)) {
    res.sendFile(avatarPath);
  } else {
    // Return default avatar if file doesn't exist
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#667eea"/>
      <text x="50" y="60" text-anchor="middle" fill="white" font-size="40" font-family="Arial">👤</text>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  }
});

router.get("/", (req, res) => {
  try {
    const avatarsPath = path.join(__dirname, "../assets/avatars/avatars.json");
    if (fs.existsSync(avatarsPath)) {
      const avatars = JSON.parse(fs.readFileSync(avatarsPath, "utf-8"));
      avatars.forEach(
        (a) => (a.url = `/api/avatars/${a.file.replace(".png", "")}`)
      );
      res.json(avatars);
    } else {
      // Return default avatars if file doesn't exist
      const defaultAvatars = [
        { name: "Default", file: "default.png", url: "/api/avatars/default" },
        { name: "Robot", file: "robot.png", url: "/api/avatars/robot" },
        { name: "Ninja", file: "ninja.png", url: "/api/avatars/ninja" },
        { name: "Wizard", file: "wizard.png", url: "/api/avatars/wizard" },
      ];
      res.json(defaultAvatars);
    }
  } catch (error) {
    console.error("Error reading avatars:", error);
    // Return default avatars on error
    const defaultAvatars = [
      { name: "Default", file: "default.png", url: "/api/avatars/default" },
      { name: "Robot", file: "robot.png", url: "/api/avatars/robot" },
      { name: "Ninja", file: "ninja.png", url: "/api/avatars/ninja" },
      { name: "Wizard", file: "wizard.png", url: "/api/avatars/wizard" },
    ];
    res.json(defaultAvatars);
  }
});

module.exports = router;
