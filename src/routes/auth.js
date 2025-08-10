// TEMP store for in-progress logins
const pendingLogins = new Map();

// Crypto
const crypto = require("crypto");

// Models
const User = require("../models/User");

// Tg api credintials
const apiHash = process.env.API_HASH;
const apiId = Number(process.env.API_ID);

// Server
const { express } = require("../start/server");
const router = express.Router();

// Telegram
const { Api } = require("telegram/tl");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

router.post("/send-code", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Telefon raqam mavjud emas" });
  }

  const user = await User.findOne({ phone });

  if (!user) {
    return res
      .status(400)
      .json({ error: "Kirish uchun ushbu telefon raqamga ruxsat mavjud emas" });
  }

  try {
    // start fresh StringSession for this attempt
    const stringSession = new StringSession("");
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 2,
    });

    await client.connect();

    // Use raw invoke to send code and receive phone_code_hash
    const result = await client.invoke(
      new Api.auth.SendCode({
        apiId: apiId,
        apiHash: apiHash,
        phoneNumber: phone,
        settings: new Api.CodeSettings({}),
      })
    );

    const phoneCodeHash = result.phoneCodeHash;

    // Save for verify-step
    pendingLogins.set(phone, { client, phoneCodeHash });

    // phoneCodeHash optional to return for debugging
    return res.json({ ok: true, phoneCodeHash });
  } catch (err) {
    console.error("send-code error", err);
    return res.status(500).json({ error: err.errorMessage });
  }
});

router.post("/verify-code", async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res
      .status(400)
      .json({ error: "Telefon raqam yoki kod mavjud emas" });
  }

  const user = await User.findOne({ phone });

  if (!user) {
    return res
      .status(400)
      .json({ error: "Kirish uchun ushbu telefon raqamga ruxsat mavjud emas" });
  }

  const pending = pendingLogins.get(phone);

  if (!pending) {
    return res.status(400).json({
      error: "Ushbu telefon raqam uchun hali kirish amalga oshirilmagan",
    });
  }

  const { client, phoneCodeHash } = pending;

  try {
    // Sign in
    await client.invoke(
      new Api.auth.SignIn({
        phoneCodeHash,
        phoneCode: code,
        phoneNumber: phone,
      })
    );

    // Save session string
    const session = client.session.save();

    // Generate unique id
    const token = crypto.randomUUID();

    // Store in MongoDB
    await User.findOneAndUpdate({ phone }, { token, session });

    // cleanup
    pendingLogins.delete(phone);
    await client.disconnect();

    return res.json({
      phone,
      token,
      ok: true,
      sessionSaved: true,
    });
  } catch (err) {
    console.error("verify-code error", err);
    return res.status(500).json({ error: err.errorMessage });
  }
});

module.exports = router;
