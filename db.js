const mongoose = require("mongoose");

async function connectDB() {
    try {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error("MONGO_URI is missing in .env");
        }

        const connection = await mongoose.connect(mongoUri);
        console.log(`MongoDB connected: ${connection.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;
