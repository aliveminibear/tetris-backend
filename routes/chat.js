const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");

// Get chat history for a game
router.get("/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const chat = await Chat.findOne({ gameId })
      .sort({ "messages.timestamp": -1 })
      .limit(50);

    if (!chat) {
      return res.json({ messages: [] });
    }

    res.json({ messages: chat.messages.reverse() });
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

// Send a message
router.post("/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const { sender, message, type = "chat" } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: "Sender and message are required" });
    }

    let chat = await Chat.findOne({ gameId });

    if (!chat) {
      chat = new Chat({ gameId });
    }

    const newMessage = {
      gameId,
      sender,
      message: message.trim(),
      type,
      timestamp: new Date(),
    };

    chat.messages.push(newMessage);
    chat.lastActivity = new Date();
    await chat.save();

    res.json({ message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
