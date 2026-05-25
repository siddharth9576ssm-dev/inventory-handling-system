const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: function passwordRequired() {
                return !this.googleId;
            },
            minlength: 6
        },
        googleId: {
            type: String,
            default: ""
        },
        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
    if (!this.password || !this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
