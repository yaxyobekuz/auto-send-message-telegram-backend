const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token topilmadi" });

    const user = await User.findOne({ token: token });

    if (!user) {
      return res.status(401).json({ message: "Foydalanuvchi topilmadi" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Token noto'g'ri yoki muddati o'tgan" });
  }
};

module.exports = authMiddleware;
