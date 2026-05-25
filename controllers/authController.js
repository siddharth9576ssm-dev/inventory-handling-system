const crypto = require("crypto");
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

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const user = await User.create({
            name,
            email,
            password,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: Date.now() + 1000 * 60 * 60
        });

        await sendVerificationEmail(req, user, verificationToken);

        res.status(201).json({
            message: "Account created. Please verify your email before login."
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
            throw new Error("Please verify your email before login");
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

async function verifyEmail(req, res, next) {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            res.status(400);
            throw new Error("Verification link is invalid or expired");
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = "";
        user.emailVerificationExpires = null;
        await user.save();

        res.send(`
            <main style="font-family: Arial, sans-serif; max-width: 560px; margin: 80px auto; line-height: 1.6;">
                <h1>Email verified</h1>
                <p>Your account is verified. You can now log in to Inventory Handling System.</p>
                <a href="/" style="display:inline-block;background:#1769e0;color:white;padding:12px 16px;border-radius:8px;text-decoration:none;">Open app</a>
            </main>
        `);
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

        const verificationToken = crypto.randomBytes(32).toString("hex");
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = Date.now() + 1000 * 60 * 60;
        await user.save();

        await sendVerificationEmail(req, user, verificationToken);
        res.json({ message: "Verification email sent again" });
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

async function sendVerificationEmail(req, user, token) {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const verifyUrl = `${baseUrl}/api/auth/verify-email/${token}`;

    await sendEmail({
        to: user.email,
        subject: "Verify your Inventory Handling System account",
        html: `
            <h2>Verify your email</h2>
            <p>Hello ${user.name},</p>
            <p>Click the button below to verify your account. This link expires in 1 hour.</p>
            <p><a href="${verifyUrl}" style="background:#1769e0;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none;">Verify Email</a></p>
            <p>If the button does not work, open this link:</p>
            <p>${verifyUrl}</p>
        `
    });
}

module.exports = { signup, login, getMe, verifyEmail, resendVerification, deleteAccount };
