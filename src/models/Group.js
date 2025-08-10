const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  title: { type: String, default: "Mavjud emas" },
  chatId: { type: String, unique: true, required: true },
  type: { type: String, default: "group", enum: ["group", "supergroup"] },
});

module.exports = mongoose.model("Group", groupSchema);
