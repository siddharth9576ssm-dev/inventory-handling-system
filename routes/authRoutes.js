const express = require("express");
const { signup, login, getMe, verifyEmailCode, resendVerification, deleteAccount } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-email", verifyEmailCode);
router.post("/resend-verification", resendVerification);
router.get("/me", protect, getMe);
router.delete("/me", protect, deleteAccount);

module.exports = router;
