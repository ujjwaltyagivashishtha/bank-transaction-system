const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

/* POST /api/auth/register */
router.post("/register", authController.userRegisterController);

/* POST /api/auth/login */
router.post("/login", authController.userLoginController);

/* GET /api/auth/me */
router.get("/me", authMiddleware.authMiddleware, authController.getMeController);

/* POST /api/auth/change-password */
router.post("/change-password", authMiddleware.authMiddleware, authController.changePasswordController);

/* PATCH /api/auth/preferences */
router.patch("/preferences", authMiddleware.authMiddleware, authController.updatePreferencesController);

/* GET /api/auth/security-status */
router.get("/security-status", authMiddleware.authMiddleware, authController.getSecurityStatusController);

/* POST /api/auth/logout */
router.post("/logout", authController.userLogoutController);

module.exports = router;