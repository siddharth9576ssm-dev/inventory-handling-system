const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
            default: "General"
        },
        sku: {
            type: String,
            trim: true,
            default: ""
        },
        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: 0,
            default: 0
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: 0,
            default: 0
        },
        supplier: {
            type: String,
            trim: true,
            default: ""
        },
        status: {
            type: String,
            enum: ["In Stock", "Low Stock", "Out of Stock"],
            default: "In Stock"
        },
        lowStockLimit: {
            type: Number,
            min: 0,
            default: 5
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
