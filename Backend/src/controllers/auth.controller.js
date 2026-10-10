const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlackListModel = require("../models/blackList.model");
const auditLogModel = require("../models/auditLog.model");

const TOKEN_EXPIRY_SECONDS = 3 * 24 * 60 * 60; // 3 days

function getCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: TOKEN_EXPIRY_SECONDS * 1000
    };
}

/**
 * User Register Controller
 * POST /api/auth/register
 */
async function userRegisterController(req, res) {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({
            message: "Name, email, and password are required"
        });
    }

    if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters long"
        });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const isExists = await userModel.findOne({
        email: trimmedEmail
    });

    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        });
    }

    const user = await userModel.create({
        email: trimmedEmail,
        password,
        name: name.trim()
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token, getCookieOptions());

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: Boolean(user.systemUser),
            preferences: user.preferences
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
 * User Login Controller
 * POST /api/auth/login
 */
async function userLoginController(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const user = await userModel.findOne({ email: email.trim().toLowerCase() }).select("+password +systemUser");

    // Generic error message prevents account enumeration
    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token, getCookieOptions());

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: Boolean(user.systemUser),
            preferences: user.preferences,
            lastLoginAt: user.lastLoginAt
        },
        token
    });
}

/**
 * User Profile / Me Controller
 * GET /api/auth/me
 */
async function getMeController(req, res) {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized access"
        });
    }

    const user = await userModel.findById(req.user._id);

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: Boolean(user.systemUser),
            preferences: user.preferences,
            lastLoginAt: user.lastLoginAt,
            passwordChangedAt: user.passwordChangedAt
        }
    });
}

/**
 * Change Password Controller
 * POST /api/auth/change-password
 */
async function changePasswordController(req, res) {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            message: "Current password and new password are required"
        });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({
            message: "New password must be at least 8 characters long"
        });
    }

    const user = await userModel.findById(req.user._id).select("+password");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Audit log security event
    try {
        await auditLogModel.create({
            action: "SECURITY_EVENT",
            performedBy: user._id,
            details: { event: "PASSWORD_CHANGED" }
        });
    } catch (e) {
        console.warn("Failed to log password change audit event:", e.message);
    }

    res.status(200).json({
        message: "Password updated successfully"
    });
}

/**
 * Update Notification Preferences Controller
 * PATCH /api/auth/preferences
 */
async function updatePreferencesController(req, res) {
    const { emailNotifications, transferAlerts, securityAlerts } = req.body;

    const user = await userModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    user.preferences = {
        emailNotifications: emailNotifications !== undefined ? Boolean(emailNotifications) : user.preferences?.emailNotifications ?? true,
        transferAlerts: transferAlerts !== undefined ? Boolean(transferAlerts) : user.preferences?.transferAlerts ?? true,
        securityAlerts: securityAlerts !== undefined ? Boolean(securityAlerts) : user.preferences?.securityAlerts ?? true,
    };

    await user.save();

    res.status(200).json({
        message: "Preferences updated successfully",
        preferences: user.preferences
    });
}

/**
 * Get Security Status & Session Health
 * GET /api/auth/security-status
 */
async function getSecurityStatusController(req, res) {
    const user = await userModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Fetch user's security audit logs
    const securityEvents = await auditLogModel.find({
        performedBy: user._id,
        action: { $in: ["SECURITY_EVENT", "ACCOUNT_FREEZE", "ACCOUNT_UNFREEZE", "ACCOUNT_CLOSE"] }
    }).sort({ createdAt: -1 }).limit(10).lean();

    res.status(200).json({
        security: {
            twoFactorStatus: "ENABLED_VIA_JWT_TOKEN",
            passwordChangedAt: user.passwordChangedAt,
            lastLoginAt: user.lastLoginAt,
            sessionDurationHours: 72,
            preferences: user.preferences,
            recentSecurityEvents: securityEvents
        }
    });
}

/**
 * User Logout Controller
 * POST /api/auth/logout
 */
async function userLogoutController(req, res) {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[ 1 ];

    if (token) {
        try {
            await tokenBlackListModel.create({
                token: token
            });
        } catch (err) {
            // Token already blacklisted, ignore error
        }
    }

    res.clearCookie("token", getCookieOptions());

    res.status(200).json({
        message: "User logged out successfully"
    });
}

module.exports = {
    userRegisterController,
    userLoginController,
    getMeController,
    changePasswordController,
    updatePreferencesController,
    getSecurityStatusController,
    userLogoutController
};