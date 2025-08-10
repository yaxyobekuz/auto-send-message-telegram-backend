require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 4000;

// MongoDB init
const mongoClient = new MongoClient(MONGODB_URI);
let sessionsCollection;
(async () => {
  await mongoClient.connect();
  const db = mongoClient.db(); // db name from URI
  sessionsCollection = db.collection("sessions"); // { phone, sessionString, createdAt }
  console.log("Connected to MongoDB");
})();

// TEMP store for in-progress logins: phone -> { client, phoneCodeHash }
const pendingLogins = new Map();

/**
 * 1) Send code
 * Body: { phone: "+998991234567" }
 */
app.post("/api/send-code", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });

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
        phoneNumber: phone,
        apiId: apiId,
        apiHash: apiHash,
        settings: new Api.CodeSettings({}),
      })
    );

    const phoneCodeHash = result.phoneCodeHash;

    // Save for verify-step
    pendingLogins.set(phone, { client, phoneCodeHash });

    return res.json({ ok: true, phoneCodeHash }); // phoneCodeHash optional to return for debugging
  } catch (err) {
    console.error("send-code error", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * 2) Verify code
 * Body: { phone: "+998...", code: "12345" }
 */
app.post("/api/verify-code", async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code)
    return res.status(400).json({ error: "phone & code required" });

  const pending = pendingLogins.get(phone);
  if (!pending)
    return res.status(400).json({
      error: "No pending login for this phone. Call /send-code first.",
    });

  const { client, phoneCodeHash } = pending;

  try {
    // sign in
    const result = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    );

    // If 2FA password is required, result will indicate; handle that in production
    // Save session string
    const sessionString = client.session.save();

    // store in MongoDB (encrypt in production)
    await sessionsCollection.insertOne({
      phone,
      sessionString,
      createdAt: new Date(),
    });

    // cleanup
    pendingLogins.delete(phone);
    await client.disconnect();

    return res.json({
      phone,
      ok: true,
      token: "Hello",
      sessionStringSaved: true,
    });
  } catch (err) {
    console.error("verify-code error", err);
    // If 2FA (password) required, GramJS will throw error - handle separately
    return res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
