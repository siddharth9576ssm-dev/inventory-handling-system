const User = require("../models/User");
const Product = require("../models/Product");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

async function signup(req, res, next) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400);
            throw new Error("Name, email, and password are required");
        }

        if (password.length < 6) {
            res.status(400);
            throw new Error("Password must be at least 6 characters");
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(409);
            throw new Error("This email is already registered");
        }

        const verificationCode = createVerificationCode();
        const user = await User.create({
            name,
            email,
            password,
            emailVerificationCode: verificationCode,
            emailVerificationExpires: Date.now() + 1000 * 60 * 10
        });

        await sendVerificationEmail(user, verificationCode);

        res.status(201).json({
            message: "Account created. Enter the 4-digit code sent to your email."
        });
    } catch (error) {
        next(error);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400);
            throw new Error("Email and password are required");
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        const passwordMatches = user ? await user.matchPassword(password) : false;

        if (!user || !passwordMatches) {
            res.status(401);
            throw new Error("Invalid email or password");
        }

        if (!user.isEmailVerified) {
            res.status(403);
            throw new Error("Please verify your email with the 4-digit code before login");
        }

        res.json({
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
}

async function getMe(req, res) {
    res.json({
        user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                isEmailVerified: req.user.isEmailVerified
            }
    });
}

async function verifyEmailCode(req, res, next) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const code = String(req.body.code || "").trim();

        if (!email || !/^\d{4}$/.test(code)) {
            res.status(400);
            throw new Error("Email and 4-digit code are required");
        }

        const user = await User.findOne({
            email,
            emailVerificationCode: code,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            res.status(400);
            throw new Error("Verification code is invalid or expired");
        }

        user.isEmailVerified = true;
        user.emailVerificationCode = "";
        user.emailVerificationExpires = null;
        await user.save();

        res.json({ message: "Email verified. You can now login." });
    } catch (error) {
        next(error);
    }
}

async function resendVerification(req, res, next) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();

        if (!email) {
            res.status(400);
            throw new Error("Email is required");
        }

        const user = await User.findOne({ email });
        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        if (user.isEmailVerified) {
            res.json({ message: "Email is already verified" });
            return;
        }

        const verificationCode = createVerificationCode();
        user.emailVerificationCode = verificationCode;
        user.emailVerificationExpires = Date.now() + 1000 * 60 * 10;
        await user.save();

        await sendVerificationEmail(user, verificationCode);
        res.json({ message: "A new 4-digit verification code was sent." });
    } catch (error) {
        next(error);
    }
}

async function deleteAccount(req, res, next) {
    try {
        await Product.deleteMany({ user: req.user._id });
        await User.findByIdAndDelete(req.user._id);

        res.json({ message: "Account and product data deleted permanently" });
    } catch (error) {
        next(error);
    }
}

async function sendVerificationEmail(user, code) {
    await sendEmail({
        to: user.email,
        subject: "Your Inventory Handling System verification code",
        html: `
            <h2>Verify your email</h2>
            <p>Hello ${user.name},</p>
            <p>Your 4-digit verification code is:</p>
            <p style="font-size:32px;font-weight:800;letter-spacing:6px;">${code}</p>
            <p>This code expires in 10 minutes.</p>
        `
    });
}

function createVerificationCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

module.exports = { signup, login, getMe, verifyEmailCode, resendVerification, deleteAccount };
