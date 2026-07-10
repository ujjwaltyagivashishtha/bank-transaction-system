const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");

/**
 * User Registration Controller
 * POST /api/auth/register
 */
async function userRegister(req, res) {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
        status: "failed",
      });
    }

    // Check if email already exists
    const isExists = await userModel.findOne({ email });

    if (isExists) {
      return res.status(422).json({
        message: "Email already exists",
        status: "failed",
      });
    }

    // Create user
    // Password will be hashed automatically by the pre('save') middleware
    const user = new userModel({
      name,
      email,
      password,
      systemUser: false
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    });

    res.status(201).json({
      message: "User registered successfully",
      status: "success",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });

    await emailService.sendRegistrationEmail(user.email,user.name);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
      status: "failed",
    });
  }
}

/**
 * User Login Controller
 * POST /api/auth/login
 */
async function userLogin(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        status: "failed",
      });
    }

    // Find user and include password
    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Email or Password is INVALID",
        status: "failed",
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Email or Password is INVALID",
        status: "failed",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      status: "success",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
      status: "failed",
    });
  }
}

module.exports = {
  userRegister,
  userLogin,
};