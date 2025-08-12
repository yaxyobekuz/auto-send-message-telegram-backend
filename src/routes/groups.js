// Telegram credintials
const apiHash = process.env.API_HASH;
const apiId = Number(process.env.API_ID);

// Models
const User = require("../models/User");
const Group = require("../models/Group");

// Server
const { express } = require("../start/server");
const router = express.Router();

// Telegram
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

// Middleware
const authMiddleware = require("../middleware/auth.middleware");

// Delay helper
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const getUserGroups = async ({ session, userId }) => {
  const client = new TelegramClient(
    new StringSession(session),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  await client.connect();

  let offsetId = 0;
  const limit = 150;
  const groups = [];
  const seen = new Set();

  while (true) {
    const dialogs = await client.getDialogs({ offsetId, limit });
    if (!dialogs.length) break;

    for (const dialog of dialogs) {
      const entity = dialog.entity;
      if (!entity) continue;

      const isGroup = entity.className === "Chat";
      const isSupergroup = entity.className === "Channel" && entity.megagroup;

      if ((!isGroup && !isSupergroup) || seen.has(entity.id.toString()))
        continue;

      seen.add(entity.id.toString());

      groups.push({
        userId,
        className: entity.className,
        chatId: entity.id.toString(),
        title: entity.title || "Noma'lum guruh",
        type: isSupergroup ? "supergroup" : "group",
        accessHash: entity.accessHash?.toString() || null,
      });
    }

    offsetId = dialogs[dialogs.length - 1].message?.id || 0;
    if (dialogs.length < limit) break;

    await delay(15000);
  }

  await client.disconnect();
  return groups;
};

router.post("/update", authMiddleware, async (req, res) => {
  const { session, _id: userId } = req.user;

  try {
    const groups = await getUserGroups({ session, userId });

    await Group.deleteMany({ userId });

    if (groups.length > 0) await Group.insertMany(groups);

    await User.findByIdAndUpdate(userId, { groupsCount: groups.length });

    res.send({ ok: true, totalGroups: groups.length });
  } catch (err) {
    console.error("Group update error:", err);
    res.status(500).send({ error: "Serverda ichki xatolik" });
  }
});

// Get all groups
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const limitNum = parseInt(limit);

    // Build query based on cursor
    let query = {};
    if (cursor) {
      query._id = { $lt: cursor }; // get records older than cursor
    }

    // Fetch groups with pagination
    const groups = await Group.find(query)
      .sort({ _id: -1 }) // sort by newest first
      .limit(limitNum + 1); // fetch one extra to check if more data exists

    // Check if there are more records
    const hasMore = groups.length > limitNum;
    const groupsToReturn = hasMore ? groups.slice(0, limitNum) : groups;

    // Get next cursor (last item's _id)
    const nextCursor =
      groupsToReturn.length > 0
        ? groupsToReturn[groupsToReturn.length - 1]._id
        : null;

    res.json({
      success: true,
      data: groupsToReturn,
      pagination: {
        hasMore,
        nextCursor,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching groups",
    });
  }
});

// Get user groups
router.get("/user/:userId", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "20", 10);

  if (!userId) {
    return res.status(404).send({ error: "Foydalanuvchi ID mavjud emas" });
  }

  try {
    const groups = await Group.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Group.countDocuments({ userId });

    res.json({
      page,
      total,
      groups,
      ok: true,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ error: "Serverda ichki xatolik" });
  }
});

module.exports = router;
