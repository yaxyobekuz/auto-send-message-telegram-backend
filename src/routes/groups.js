// Telegram credintials
const apiHash = process.env.API_HASH;
const apiId = Number(process.env.API_ID);

// Models
const Group = require("../models/Group");

// Server
const { express } = require("../start/server");
const router = express.Router();

// Telegram
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

// Middleware
const authMiddleware = require("../middleware/auth.middleware");

const getUserGroups = async ({ session, userId }) => {
  const client = new TelegramClient(
    new StringSession(session),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  await client.connect();

  let offsetId = 0;
  const limit = 100;
  const groups = [];
  const seen = new Set();

  while (true) {
    const dialogs = await client.getDialogs({ offsetId, limit });
    if (!dialogs.length) break;

    dialogs.forEach(({ entity }) => {
      const id = String(entity.id);
      const isGroup = entity.className === "Chat";
      const isSupergroup = entity.className === "Channel" && entity.megagroup;

      if ((!isGroup && !isSupergroup) || seen.has(id)) return;

      seen.add(id);

      groups.push({
        userId,
        chatId: id,
        title: entity.title || "Mavjud emas!",
        type: isSupergroup ? "supergroup" : "group",
      });
    });

    offsetId = dialogs[dialogs.length - 1].id;
    if (dialogs.length < limit) break;
  }

  await client.disconnect();
  return groups;
};

router.post("/update", authMiddleware, async (req, res) => {
  const { session, _id: userId } = req.user;

  try {
    const groups = await getUserGroups({ session, userId });

    await Group.deleteMany({ userId });

    if (groups.length > 0) {
      await Group.insertMany(groups);
    }

    res.send({ ok: true, totalGroups: groups.length });
  } catch (err) {
    console.error("Group update error:", err);
    res.status(500).send({ error: "Serverda ichki xatolik" });
  }
});

module.exports = router;
