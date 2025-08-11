// Models
const Message = require("../models/Message");

// Server
const { express } = require("../start/server");
const router = express.Router();

// Middleware
const authMiddleware = require("../middleware/auth.middleware");

// Get all messages
router.get("/", authMiddleware, async (req, res) => {
  const user = req.user;
  const userId = req.params.userId;
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "20", 10);

  if (user.role !== "owner") {
    return res
      .status(400)
      .json({ error: "Barcha xabarlarni olish uchun ega huquqi kerak" });
  }

  if (!userId) {
    return res.status(404).send({ error: "Foydalanuvchi ID mavjud emas" });
  }

  try {
    const messages = await Message.find({ userId })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Message.countDocuments();

    res.json({
      page,
      total,
      messages,
      ok: true,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching user messages:", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

// Get user messages
router.get("/user/:userId", authMiddleware, async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(404).send({ error: "Foydalanuvchi ID mavjud emas" });
  }

  try {
    const messages = await Message.find({ userId });
    res.json({ messages, ok: true });
  } catch (error) {
    console.error("Error fetching user messages:", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

// Add new message
router.post("/new", authMiddleware, async (req, res) => {
  const user = req.user;
  const { messages, name, time } = req.body;

  if (!time) {
    return res.status(404).send({ error: "Vaqt mavjud emas" });
  }

  if (!name) {
    return res.status(404).send({ error: "Xabarlar sarlavhasi mavjud emas" });
  }

  if (!messages || messages?.length === 0) {
    return res.status(404).send({ error: "Xabarlar mavjud emas" });
  }

  try {
    const message = await Message.create({
      name,
      time,
      messages,
      userId: user._id,
    });

    res.status(201).json({ message, ok: true });
  } catch (error) {
    console.error("Error creating message: ", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

// Delete message
router.delete("/message/:messageId", authMiddleware, async (req, res) => {
  const user = req.user;
  const messageId = req.params.messageId;

  if (!messageId) {
    return res.status(404).send({ error: "Xabar ID mavjud emas" });
  }

  try {
    const message = await Message.findOneAndDelete({
      _id: messageId,
      userId: user._id,
    });

    if (!message) {
      res.status(404).json({ error: "Xabar topilmadi" });
    }

    res.json({ message, ok: true });
  } catch (error) {
    console.error("Error deleting message: ", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

// Get user message
router.get("/message/:messageId", authMiddleware, async (req, res) => {
  const userId = req.user._id;
  const messageId = req.params.messageId;

  if (!messageId) {
    return res.status(404).send({ error: "Xabar ID mavjud emas" });
  }

  try {
    const message = await Message.findOne({ userId, _id: messageId });

    if (!message) {
      res.status(404).json({ error: "Xabar topilmadi" });
    }

    res.json({ message, ok: true });
  } catch (error) {
    console.error("Error message: ", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

// Update user message
router.put("/message/:messageId", authMiddleware, async (req, res) => {
  const userId = req.user._id;
  const messageId = req.params.messageId;
  const { messages, name, time } = req.body;

  if (!time) {
    return res.status(404).send({ error: "Vaqt mavjud emas" });
  }

  if (!name) {
    return res.status(404).send({ error: "Xabarlar sarlavhasi mavjud emas" });
  }

  if (!messages || messages?.length === 0) {
    return res.status(404).send({ error: "Xabarlar mavjud emas" });
  }

  try {
    const message = await Message.findOneAndUpdate(
      { userId, _id: messageId },
      { name, time, messages }
    );

    if (!message) {
      res.status(404).json({ error: "Xabar topilmadi" });
    }

    res.json({
      ok: true,
      message: { ...message.toObject(), name, time, messages },
    });
  } catch (error) {
    console.error("Error updating message: ", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

module.exports = router;
