const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  className: { type: String },
  userId: { type: String, required: true },
  chatId: { type: String, required: true },
  accessHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  title: { type: String, default: "Mavjud emas" },
  type: { type: String, default: "group", enum: ["group", "supergroup"] },
});

module.exports = mongoose.model("Group", groupSchema);
