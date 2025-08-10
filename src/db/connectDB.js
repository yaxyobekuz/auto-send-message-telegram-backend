const mongoose = require("mongoose");
const User = require("../models/User");
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Mango Baza ulandi! ✅🥭🗿");

    const owner = await User.findOne({ role: "owner" });

    if (!owner) {
      await User.create({
        name: "Ega",
        role: "owner",
        phone: "+998773702377",
      });

      console.log("Ega muvaffaqiyatli yaratilindi! ✅");
    }
  } catch (err) {
    console.error("MongoDB ulanmadi ❌🥭🗿", err);
    process.exit(1);
  }
};

module.exports = connectDB;
