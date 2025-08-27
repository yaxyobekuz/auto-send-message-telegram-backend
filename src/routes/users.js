// Server
const express = require("express");
const router = express.Router();

// Models
const User = require("../models/User");
const Group = require("../models/Group");
const Message = require("../models/Message");

// Middleware
const authMiddleware = require("../middleware/auth.middleware");

// Get all users
router.get("/", authMiddleware, async (req, res) => {
  const user = req.user;
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "20", 10);

  if (user.role !== "owner") {
    return res
      .status(400)
      .json({ error: "Foydalanuvchilarni olish uchun ega huquqi kerak" });
  }

  try {
    const users = await User.find()
      .select("-token -session")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      page,
      total,
      users,
      ok: true,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: "Serverd ichki xatolik" });
  }
});

// Create new user
router.post("/user/new", authMiddleware, async (req, res) => {
  const user = req.user;

  if (user.role !== "owner") {
    return res
      .status(400)
      .json({ error: "Foydalanuvchini qo'shish uchun ega huquqi kerak" });
  }

  try {
    const { phone, name = "Admin" } = req.body;

    // Check required fields
    if (!phone) {
      return res.status(400).json({ error: "Telefon raqam mavjud emas" });
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Foydalanuvchi allaqachon qo'shilgan" });
    }

    const newUser = await User.create({ phone, name });

    // Remove sensitive data from response
    const userResponse = newUser.toObject();
    delete userResponse.token;
    delete userResponse.session;

    res.status(201).json({ ok: true, user: userResponse });
  } catch (error) {
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

// Delete user
router.delete("/user/:userId", authMiddleware, async (req, res) => {
  const user = req.user;
  const { userId } = req.params;

  if (user.role !== "owner") {
    return res
      .status(403)
      .json({ error: "Foydalanuvchini o'chirish uchun ega huquqi kerak" });
  }

  try {
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const messages = await Message.find({ userId });

    for (let message of messages) {
      await messageScheduler.removeScheduledMessage(message._id);
    }

    await Group.deleteMany({ userId });
    await Message.deleteMany({ userId });

    res.json({ ok: true, message: "Foydalanuvchi o'chirildi" });
  } catch (error) {
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

// Get current user profile
router.get("/user/me", authMiddleware, async (req, res) => {
  let user = req.user.toObject();

  delete user.token;
  delete user.session;

  res.json({ ok: true, user });
});

module.exports = router;
