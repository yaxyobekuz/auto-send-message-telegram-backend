const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  messages: [{ type: String }],
  time: { type: String, required: true },
  name: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
