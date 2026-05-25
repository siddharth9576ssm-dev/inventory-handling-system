const Product = require("../models/Product");

function getStatus(quantity, lowStockLimit) {
    if (quantity <= 0) return "Out of Stock";
    if (quantity <= lowStockLimit) return "Low Stock";
    return "In Stock";
}

async function getProducts(req, res, next) {
    try {
        const { search = "", category = "", status = "" } = req.query;
        const query = { user: req.user._id };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } },
                { supplier: { $regex: search, $options: "i" } }
            ];
        }

        if (category) query.category = category;
        if (status) query.status = status;

        const products = await Product.find(query).sort({ updatedAt: -1 });
        res.json({ products });
    } catch (error) {
        next(error);
    }
}

async function createProduct(req, res, next) {
    try {
        const productData = cleanProductInput(req.body);

        if (!productData.name) {
            res.status(400);
            throw new Error("Product name is required");
        }

        const product = await Product.create({
            ...productData,
            status: getStatus(productData.quantity, productData.lowStockLimit),
            user: req.user._id
        });

        res.status(201).json({ product });
    } catch (error) {
        next(error);
    }
}

async function updateProduct(req, res, next) {
    try {
        const product = await Product.findOne({ _id: req.params.id, user: req.user._id });

        if (!product) {
            res.status(404);
            throw new Error("Product not found");
        }

        const productData = cleanProductInput(req.body);
        Object.assign(product, productData, {
            status: getStatus(productData.quantity, productData.lowStockLimit)
        });

        const updatedProduct = await product.save();
        res.json({ product: updatedProduct });
    } catch (error) {
        next(error);
    }
}

async function deleteProduct(req, res, next) {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, user: req.user._id });

        if (!product) {
            res.status(404);
            throw new Error("Product not found");
        }

        res.json({ message: "Product deleted" });
    } catch (error) {
        next(error);
    }
}

async function getDashboard(req, res, next) {
    try {
        const products = await Product.find({ user: req.user._id }).sort({ updatedAt: -1 });
        const totalProducts = products.length;
        const totalStock = products.reduce((sum, product) => sum + product.quantity, 0);
        const lowStock = products.filter((product) => product.status === "Low Stock" || product.status === "Out of Stock");
        const totalValue = products.reduce((sum, product) => sum + product.quantity * product.price, 0);
        const recentActivity = products.slice(0, 5).map((product) => ({
            id: product._id,
            name: product.name,
            status: product.status,
            updatedAt: product.updatedAt
        }));

        res.json({
            totalProducts,
            totalStock,
            lowStockCount: lowStock.length,
            totalValue,
            recentActivity
        });
    } catch (error) {
        next(error);
    }
}

function cleanProductInput(body) {
    const quantity = Number(body.quantity);
    const price = Number(body.price);
    const lowStockLimit = Number(body.lowStockLimit);

    return {
        name: String(body.name || "").trim(),
        category: String(body.category || "General").trim(),
        sku: String(body.sku || "").trim(),
        quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        supplier: String(body.supplier || "").trim(),
        lowStockLimit: Number.isFinite(lowStockLimit) && lowStockLimit >= 0 ? lowStockLimit : 5
    };
}

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getDashboard
};
