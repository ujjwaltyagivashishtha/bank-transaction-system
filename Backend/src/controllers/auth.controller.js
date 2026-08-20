const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({
            message: "Name, email, and password are required"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters long"
        });
    }

    const isExists = await userModel.findOne({
        email: email.trim().toLowerCase()
    });

    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        });
    }

    const user = await userModel.create({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim()
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: Boolean(user.systemUser)
        },
        token
    });

    // Non-fatal background email notification
    try {
        await emailService.sendRegistrationEmail(user.email, user.name);
    } catch (emailErr) {
        console.warn("Failed to dispatch registration email:", emailErr.message);
    }
}

/**
 * - User Login Controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const user = await userModel.findOne({ email: email.trim().toLowerCase() }).select("+password +systemUser");

    if (!user) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: Boolean(user.systemUser)
        },
        token
    });
}

/**
 * - User Profile / Me Controller
 * - GET /api/auth/me
 */
async function getMeController(req, res) {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized access"
        });
    }

    res.status(200).json({
        user: {
            _id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            systemUser: Boolean(req.user.systemUser)
        }
    });
}

/**
 * - User Logout Controller
 * - POST /api/auth/logout
 */
async function userLogoutController(req, res) {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[ 1 ];

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        });
    }

    try {
        await tokenBlackListModel.create({
            token: token
        });
    } catch (err) {
        // If already blacklisted, ignore error
    }

    res.clearCookie("token");

    res.status(200).json({
        message: "User logged out successfully"
    });
}

module.exports = {
    userRegisterController,
    userLoginController,
    getMeController,
    userLogoutController
}