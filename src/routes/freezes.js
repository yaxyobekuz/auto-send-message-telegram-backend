// Models
const Freeze = require("../models/Freeze");
const Message = require("../models/Message");

// Middleware
const authMiddleware = require("../middleware/auth.middleware");

// Server
const { express, messageScheduler } = require("../start/server");
const router = express.Router();

router.get("/freeze/me", authMiddleware, async (req, res) => {
  const userId = req.user._id.toString();

  try {
    const freeze = await Freeze.findOne({ userId });
    const resData = { ok: true, message: "Freeze qilingan", freeze: true };

    if (!freeze) {
      Object.assign(resData, { freeze: false, message: "Freeze qilinmagan" });
    }

    return res.json(resData);
  } catch (error) {
    console.error("Error adding freeze:", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

router.post("/freeze", authMiddleware, async (req, res) => {
  const userId = req.user._id.toString();

  try {
    const exists = await Freeze.findOne({ userId });

    if (exists) {
      return res
        .status(400)
        .json({ ok: false, message: "Allaqachon freeze qilingan" });
    }

    const messages = await Message.find({ userId });

    for (let message of messages) {
      await messageScheduler.removeScheduledMessage(message._id);
    }

    await Freeze.create({ userId });

    res.json({ ok: true, message: "Freeze qo'shildi" });
  } catch (error) {
    console.error("Error adding freeze:", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

router.delete("/freeze", authMiddleware, async (req, res) => {
  const userId = req.user._id.toString();

  try {
    const result = await Freeze.deleteOne({ userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ ok: false, message: "Freeze topilmadi" });
    }

    const messages = await Message.find({ userId });

    for (let message of messages) {
      await messageScheduler.addScheduledMessage(message._id);
    }

    res.json({ ok: true, message: "Freeze olib tashlandi" });
  } catch (error) {
    console.error("Error removing freeze:", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

module.exports = router;
