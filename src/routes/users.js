// Server
const express = require("express");
const router = express.Router();

// Models
const User = require("../models/User");

// Middleware
const authMiddleware = require("../middleware/auth.middleware");

// Get all users
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-token -session");

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

// Get user by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-token -session");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
});

// Create new user
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { phone, name, role = "admin" } = req.body;

    // Check required fields
    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        message: "Phone and name are required",
      });
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this phone already exists",
      });
    }

    const newUser = new User({
      phone,
      name,
      role,
    });

    const savedUser = await newUser.save();

    // Remove sensitive data from response
    const userResponse = savedUser.toObject();
    delete userResponse.token;
    delete userResponse.session;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
});

// Update user
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, role, groupsCount } = req.body;
    const updateData = {};

    // Only update provided fields
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (groupsCount !== undefined) updateData.groupsCount = groupsCount;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-token -session");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
});

// Delete user
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
});

// Update user session
router.patch("/:id/session", authMiddleware, async (req, res) => {
  try {
    const { session } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { session },
      { new: true }
    ).select("-token -session");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User session updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update session",
      error: error.message,
    });
  }
});

// Get current user profile
router.get("/user/me", authMiddleware, async (req, res) => {
  let user = req.user.toObject();

  delete user.token;
  delete user.session;

  res.json({ ok: true, user });
});

module.exports = router;
