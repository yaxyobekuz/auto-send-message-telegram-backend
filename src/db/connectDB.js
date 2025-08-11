const mongoose = require("mongoose");
const User = require("../models/User");
const MONGODB_URI = process.env.MONGODB_URI;
const OWNER_PHONE = process.env.OWNER_PHONE;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Mango Baza ulandi! ✅🥭🗿");

    const owner = await User.findOne({ phone: OWNER_PHONE });

    if (!owner) {
      await User.create({
        name: "Ega",
        role: "owner",
        phone: OWNER_PHONE,
      });

      console.log("Ega muvaffaqiyatli yaratilindi! ✅");
    }
  } catch (err) {
    console.error("MongoDB ulanmadi ❌🥭🗿", err);
    process.exit(1);
  }
};

module.exports = connectDB;
