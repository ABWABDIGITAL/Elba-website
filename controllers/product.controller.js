// controllers/product.controller.js
import {
  createProductService,
  updateProductService,
  deleteProductService,
  getAllProductsService,
  getProductBySkuService,
  getCompareProductsService,
  getBestSellingByCategoryService,
  getBestOffersService,
  getProductsByCatalog
} from "../services/product.services.js";

import { StatusCodes } from "http-status-codes";

/* -----------------------------------------------------
   INTERNAL HELPERS (LOCAL ONLY TO THIS FILE)
----------------------------------------------------- */

const safeJSON = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const localized = (req, base, fallback = {}) => ({
  en: req.body?.[`${base}.en`] ?? fallback.en ?? "",
  ar: req.body?.[`${base}.ar`] ?? fallback.ar ?? "",
});

// ----- Normalizers for complex fields -----

const normalizeDescription = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    title: {
      en: item?.title?.en || "",
      ar: item?.title?.ar || "",
    },
    subtitle: {
      en: item?.subtitle?.en || "",
      ar: item?.subtitle?.ar || "",
    },
    content: {
      en: item?.content?.en || "",
      ar: item?.content?.ar || "",
    },
  }));
};

const normalizeSpecifications = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    key: { en: item?.key?.en || "", ar: item?.key?.ar || "" },
    value: { en: item?.value?.en || "", ar: item?.value?.ar || "" },
    unit: { en: item?.unit?.en || "", ar: item?.unit?.ar || "" },
    group: { en: item?.group?.en || "", ar: item?.group?.ar || "" },
  }));
};

const normalizeDetails = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    key: { en: item?.key?.en || "", ar: item?.key?.ar || "" },
    value: { en: item?.value?.en || "", ar: item?.value?.ar || "" },
  }));
};

const normalizeReference = (req) => {
  const file = req?.files?.reference?.[0];

  return {
    title: localized(req, "reference.title"),
    subtitle: localized(req, "reference.subtitle"),
    content: {
      text: localized(req, "reference.content.text"),
      file: file
        ? {
            url: `/uploads/products/reference/${file.filename}`,
            filename: file.originalname,
            size: file.size,
            fileType: file.mimetype,
          }
        : null,
    },
  };
};

const normalizeImages = (req) => {
  if (!req.files?.images) return [];

  return req.files.images.map((file, i) => ({
    url: `/uploads/products/images/${file.filename}`,
    alt: localized(req, `images[${i}].alt`),
    isPrimary: i === 0,
    order: i + 1,
  }));
};

/* -----------------------------------------------------
   PAYLOAD NORMALIZATION FOR CREATE / UPDATE
----------------------------------------------------- */

const normalizeCreatePayload = (req) => {
  // Start with the original request body
  const payload = { ...req.body };

  // Ensure required localized fields are preserved
  if (!payload.name) payload.name = {};
  if (!payload.title) payload.title = {};
  if (!payload.warranty) payload.warranty = {};

  // Only override if values exist in the request
  if (req.body.name?.en || req.body.name?.ar) {
    payload.name = {
      en: req.body.name.en || '',
      ar: req.body.name.ar || ''
    };
  }

  if (req.body.title?.en || req.body.title?.ar) {
    payload.title = {
      en: req.body.title.en || '',
      ar: req.body.title.ar || ''
    };
  }

  if (req.body.warranty?.en || req.body.warranty?.ar) {
    payload.warranty = {
      en: req.body.warranty.en || '',
      ar: req.body.warranty.ar || ''
    };
  }

  // Handle reference object
  if (!payload.reference) payload.reference = {};
  if (!payload.reference.title) payload.reference.title = {};
  if (!payload.reference.subtitle) payload.reference.subtitle = {};

  if (req.body.reference?.title?.en || req.body.reference?.title?.ar) {
    payload.reference.title = {
      en: req.body.reference?.title?.en || '',
      ar: req.body.reference?.title?.ar || ''
    };
  }

  if (req.body.reference?.subtitle?.en || req.body.reference?.subtitle?.ar) {
    payload.reference.subtitle = {
      en: req.body.reference?.subtitle?.en || '',
      ar: req.body.reference?.subtitle?.ar || ''
    };
  }

  // Process other fields only if they exist
  if (req.body.description) {
    payload.description = normalizeDescription(safeJSON(req.body.description));
  }

  if (req.body.specifications) {
    payload.specifications = normalizeSpecifications(safeJSON(req.body.specifications));
  }

  if (req.body.details) {
    payload.details = normalizeDetails(safeJSON(req.body.details));
  }

  // Only normalize images if they exist
  if (req.files || req.body.images) {
    payload.images = normalizeImages(req);
  }

  return payload;
};

const normalizeUpdatePayload = (req) => {
  const payload = { ...req.body };

  // Partial localized updates
  if (req.body["name.en"] || req.body["name.ar"]) {
    payload.name = localized(req, "name");
  }

  if (req.body["title.en"] || req.body["title.ar"]) {
    payload.title = localized(req, "title");
  }

  if (req.body["warranty.en"] || req.body["warranty.ar"]) {
    payload.warranty = localized(req, "warranty");
  }

  if (req.body.description) {
    payload.description = normalizeDescription(
      safeJSON(req.body.description)
    );
  }

  if (req.body.specifications) {
    payload.specifications = normalizeSpecifications(
      safeJSON(req.body.specifications)
    );
  }

  if (req.body.details) {
    payload.details = normalizeDetails(safeJSON(req.body.details));
  }

  if (req.files?.reference) {
    payload.reference = normalizeReference(req);
  }

  if (req.files?.images) {
    payload.images = normalizeImages(req);
  }

  return payload;
};

/* -----------------------------------------------------
   CONTROLLERS
----------------------------------------------------- */

// CREATE
export const createProductController = async (req, res, next) => {
  try {
    const normalized = normalizeCreatePayload(req);
    console.log('Request body:', req.body); // Add this line

    const result = await createProductService(normalized);
    console.log('Result:', result); // Add this line
    res.status(StatusCodes.CREATED).json(result);
  } catch (err) {
    next(err);
  }
};

// UPDATE
export const updateProductController = async (req, res, next) => {
  try {
    const normalized = normalizeUpdatePayload(req);
    const result = await updateProductService(
      req.params.productId,
      normalized
    );
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// DELETE (soft delete via isActive=false in service)
export const deleteProductController = async (req, res, next) => {
  try {
    const result = await deleteProductService(req.params.productId);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// LIST + FILTER + PAGINATION (ApiFeatures in service)
export const getAllProductsController = async (req, res, next) => {
  try {
    const result = await getAllProductsService(req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// GET SINGLE PRODUCT BY SKU
// Route: GET /products/:sku
export const getProductBySkuController = async (req, res, next) => {
  try {
    const result = await getProductBySkuService(req.params.sku);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// COMPARE PRODUCTS BY SKU
// Route: GET /products/compare?skus=IP15,SGS24,...
export const getCompareProductsController = async (req, res, next) => {
  try {
    const skusParam = req.query.skus;
    const skus = typeof skusParam === "string"
      ? skusParam.split(",").map((s) => s.trim()).filter(Boolean)
      : Array.isArray(skusParam)
        ? skusParam
        : [];

    const result = await getCompareProductsService(skus);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// BEST SELLING BY CATEGORY (BY salesCount)
// Route: GET /products/category/:categoryId/best-selling?top=10&...
export const getBestSellingByCategoryController = async (
  req,
  res,
  next
) => {
  try {
    const { categoryId } = req.params;
    const result = await getBestSellingByCategoryService(categoryId, req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// BEST OFFERS (HIGHEST discountPercentage)
// Route: GET /products/best-offers?top=10&...
export const getBestOffersController = async (req, res, next) => {
  try {
    const result = await getBestOffersService(req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// GET PRODUCTS BY CATALOG
// Route: GET /products/catalog/:catalogId
export const getProductsByCatalogController = async (req, res, next) => {
  try {
    const { catalogId } = req.params;
    const result = await getProductsByCatalog(catalogId);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};