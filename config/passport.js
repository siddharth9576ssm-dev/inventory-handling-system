const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/User");

function configurePassport() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log("Google OAuth skipped. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.");
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : "";

                    if (!email) {
                        return done(new Error("Google account email not found"), null);
                    }

                    let user = await User.findOne({ email });

                    if (!user) {
                        user = await User.create({
                            name: profile.displayName || "Google User",
                            email,
                            googleId: profile.id,
                            authProvider: "google",
                            isEmailVerified: true
                        });
                    } else {
                        user.googleId = user.googleId || profile.id;
                        user.authProvider = user.authProvider === "local" ? "local" : "google";
                        user.isEmailVerified = true;
                        await user.save();
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error, null);
                }
            }
        )
    );
}

module.exports = configurePassport;
