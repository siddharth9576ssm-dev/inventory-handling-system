const express = require("express");
const passport = require("passport");
const { signup, login, getMe, verifyEmailCode, resendVerification, deleteAccount, googleCallback } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

function requireGoogleConfig(req, res, next) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        res.status(503);
        throw new Error("Google login is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    }

    next();
}

router.post("/signup", signup);
router.post("/login", login);
router.get("/google", requireGoogleConfig, passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get(
    "/google/callback",
    requireGoogleConfig,
    passport.authenticate("google", { failureRedirect: "/", session: false }),
    googleCallback
);
router.post("/verify-email", verifyEmailCode);
router.post("/resend-verification", resendVerification);
router.get("/me", protect, getMe);
router.delete("/me", protect, deleteAccount);

module.exports = router;
