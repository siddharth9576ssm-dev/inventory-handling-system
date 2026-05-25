const User = require("../models/User");
const Product = require("../models/Product");
const generateToken = require("../utils/generateToken");

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

        const user = await User.create({
            name,
            email,
            password,
            isEmailVerified: true
        });

        res.status(201).json({
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

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400);
            throw new Error("Email and password are required");
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (user && user.authProvider === "google" && !user.password) {
            res.status(400);
            throw new Error("Please continue with Google for this account");
        }

        const passwordMatches = user ? await user.matchPassword(password) : false;

        if (!user || !passwordMatches) {
            res.status(401);
            throw new Error("Invalid email or password");
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

async function deleteAccount(req, res, next) {
    try {
        await Product.deleteMany({ user: req.user._id });
        await User.findByIdAndDelete(req.user._id);

        res.json({ message: "Account and product data deleted permanently" });
    } catch (error) {
        next(error);
    }
}

function googleCallback(req, res) {
    const token = generateToken(req.user._id);
    const user = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
    };
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const redirectUrl = new URL("/", appUrl);

    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("user", Buffer.from(JSON.stringify(user)).toString("base64url"));
    res.redirect(redirectUrl.toString());
}

module.exports = { signup, login, getMe, deleteAccount, googleCallback };
