import express from "express";
import { allowTo, protect } from "../middlewares/authMiddleware.js";
import {validateCreateCatalog , validateUpdateCatalog , validateDeleteCatalog , validateGetCatalog} from "../validators/catalog.validators.js"
import { createCatalogController, deleteCatalogController, getAllCatalogsController, getCatalogByIdController, updateCatalogController } from "../controllers/catalog.controller.js";
import upload from "../middlewares/uploadMiddleware.js";
const router = express.Router();

router.post(
  "/",
  protect,
  allowTo("admin"),
  upload({ folder: "catalogs" }).single("image"),
  validateCreateCatalog,
  createCatalogController
);

router.get("/", getAllCatalogsController);
router.get("/:id", validateGetCatalog, getCatalogByIdController);
router.put("/:id", protect,allowTo("admin"), upload({ folder: "catalogs" }).single("image"), validateUpdateCatalog, updateCatalogController);
router.delete("/:id", protect,allowTo("admin"), validateDeleteCatalog, deleteCatalogController);

export default router;  