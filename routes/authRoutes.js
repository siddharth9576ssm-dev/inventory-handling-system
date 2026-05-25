const express = require("express");
const passport = require("passport");
const { signup, login, getMe, verifyEmailCode, resendVerification, deleteAccount, googleCallback } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/", session: false }),
    googleCallback
);
router.post("/verify-email", verifyEmailCode);
router.post("/resend-verification", resendVerification);
router.get("/me", protect, getMe);
router.delete("/me", protect, deleteAccount);

module.exports = router;
