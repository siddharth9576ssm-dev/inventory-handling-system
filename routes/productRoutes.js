const express = require("express");
const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getDashboard
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/dashboard", getDashboard);
router.route("/").get(getProducts).post(createProduct);
router.route("/:id").put(updateProduct).delete(deleteProduct);

module.exports = router;
