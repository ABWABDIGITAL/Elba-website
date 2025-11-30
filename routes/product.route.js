import express from "express";
import {
  createProductController,
  updateProductController,
  deleteProductController,
  getAllProductsController,
  getProductBySkuController,
  getCompareProductsController,
  getBestSellingByCategoryController,
  getBestOffersController,
  getProductsByCatalogController
} from "../controllers/product.controller.js";
import { protect, allowTo } from "../middlewares/authMiddleware.js";

// import parseNestedJson from "../middlewares/ParseNestedDot.js";

import {
  validateCreateProduct,
  validateUpdateProduct,
} from "../validators/product.validators.js";

const router = express.Router();

// Add express.json() middleware to parse JSON bodies
router.use(express.json());

// CREATE PRODUCT
router.post(
  "/",
  (req, res, next) => {
    // Log the raw body for debugging
    console.log('Raw body:', req.body);
    next();
  },
  validateCreateProduct,
  createProductController
);
/* ---------------------------------------------
   UPDATE PRODUCT
---------------------------------------------- */
router.patch(
  "/:productId",
  validateUpdateProduct,
  updateProductController
);

router.get("/",protect, getAllProductsController);
// by SKU
router.get("/sku/:sku",protect, getProductBySkuController);

// compare by SKU
router.get("/compare", protect,getCompareProductsController);

// best selling by category
router.get(
  "/category/:categoryId/best-selling",
  protect,
  getBestSellingByCategoryController
);


// best offers
router.get("/best-offers", protect,getBestOffersController);
router.get("/catalog/:catalogId", protect,getProductsByCatalogController);

router.delete("/:productId", protect, deleteProductController);
export default router;
