const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  token: { type: String },
  session: { type: String },
  phone: { type: String, unique: true },
  name: { type: String, required: true },
  groupsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "admin", enum: ["admin", "owner"] },
});

module.exports = mongoose.model("User", userSchema);
