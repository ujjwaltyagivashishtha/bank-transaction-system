const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blackList.model")



async function authMiddleware(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[ 1 ];

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        });
    }

    try {
        const isBlacklisted = await tokenBlackListModel.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({
                message: "Unauthorized access, token is invalid"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId).select("+systemUser");

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized access, user does not exist"
            });
        }

        // Attach only minimal sanitized user data
        req.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            systemUser: Boolean(user.systemUser)
        };

        return next();
    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        });
    }
}

async function authSystemUserMiddleware(req, res, next) {
    // Chain with authMiddleware if req.user is not yet populated
    if (!req.user) {
        return authMiddleware(req, res, () => {
            if (!req.user?.systemUser) {
                return res.status(403).json({
                    message: "Forbidden access, not a system user"
                });
            }
            return next();
        });
    }

    if (!req.user.systemUser) {
        return res.status(403).json({
            message: "Forbidden access, not a system user"
        });
    }

    return next();
}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware
}