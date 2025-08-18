const mongoose = require("mongoose");

const freezeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Freeze", freezeSchema);
