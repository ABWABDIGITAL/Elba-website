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

// ----- Normalizers for complex fields (Updated for new structure) -----

const normalizeDescriptionForLang = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    title: item?.title || "",
    subtitle: item?.subtitle || "",
    content: item?.content || "",
  }));
};

const normalizeSpecificationsForLang = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    key: item?.key || "",
    value: item?.value || "",
    unit: item?.unit || "",
    group: item?.group || "",
  }));
};

const normalizeDetailsForLang = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    key: item?.key || "",
    value: item?.value || "",
  }));
};

const normalizeReferenceForLang = (req, lang) => {
  const file = req?.files?.reference?.[0];

  return {
    title: req.body?.[lang]?.reference?.title || "",
    subtitle: req.body?.[lang]?.reference?.subtitle || "",
    content: {
      text: req.body?.[lang]?.reference?.content?.text || "",
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

const normalizeImagesForLang = (req, lang) => {
  if (!req.files?.images) return [];

  return req.files.images.map((file, i) => ({
    url: `/uploads/products/images/${file.filename}`,
    alt: req.body?.[lang]?.images?.[i]?.alt || "",
    isPrimary: i === 0,
    order: i + 1,
  }));
};

/* -----------------------------------------------------
   PAYLOAD NORMALIZATION FOR CREATE / UPDATE
----------------------------------------------------- */

const normalizeCreatePayload = (req) => {
  const payload = {};

  // Build English localized data
  payload.en = {
    name: req.body.en?.name || "",
    title: req.body.en?.title || "",
    warranty: req.body.en?.warranty || "",
  };

  if (req.body.en?.description) {
    payload.en.description = normalizeDescriptionForLang(safeJSON(req.body.en.description));
  }

  if (req.body.en?.specifications) {
    payload.en.specifications = normalizeSpecificationsForLang(safeJSON(req.body.en.specifications));
  }

  if (req.body.en?.details) {
    payload.en.details = normalizeDetailsForLang(safeJSON(req.body.en.details));
  }

  if (req.body.en?.features) {
    payload.en.features = Array.isArray(req.body.en.features) ? req.body.en.features : [];
  }

  if (req.body.en?.reference || req.files?.reference) {
    payload.en.reference = normalizeReferenceForLang(req, 'en');
  }

  if (req.files?.images) {
    payload.en.images = normalizeImagesForLang(req, 'en');
  }

  // Build Arabic localized data
  payload.ar = {
    name: req.body.ar?.name || "",
    title: req.body.ar?.title || "",
    warranty: req.body.ar?.warranty || "",
  };

  if (req.body.ar?.description) {
    payload.ar.description = normalizeDescriptionForLang(safeJSON(req.body.ar.description));
  }

  if (req.body.ar?.specifications) {
    payload.ar.specifications = normalizeSpecificationsForLang(safeJSON(req.body.ar.specifications));
  }

  if (req.body.ar?.details) {
    payload.ar.details = normalizeDetailsForLang(safeJSON(req.body.ar.details));
  }

  if (req.body.ar?.features) {
    payload.ar.features = Array.isArray(req.body.ar.features) ? req.body.ar.features : [];
  }

  if (req.body.ar?.reference || req.files?.reference) {
    payload.ar.reference = normalizeReferenceForLang(req, 'ar');
  }

  if (req.files?.images) {
    payload.ar.images = normalizeImagesForLang(req, 'ar');
  }

  // Add language-independent fields
  if (req.body.sku) payload.sku = req.body.sku;
  if (req.body.modelNumber) payload.modelNumber = req.body.modelNumber;
  if (req.body.price !== undefined) payload.price = Number(req.body.price);
  if (req.body.discountPrice !== undefined) payload.discountPrice = Number(req.body.discountPrice);
  if (req.body.discountPercentage !== undefined) payload.discountPercentage = Number(req.body.discountPercentage);
  if (req.body.currencyCode) payload.currencyCode = req.body.currencyCode;
  if (req.body.stock !== undefined) payload.stock = Number(req.body.stock);
  if (req.body.status) payload.status = req.body.status;
  if (req.body.category) payload.category = req.body.category;
  if (req.body.brand) payload.brand = req.body.brand;

  return payload;
};

const normalizeUpdatePayload = (req) => {
  const payload = {};

  // Update English localized fields if provided
  if (req.body.en) {
    payload.en = {};

    if (req.body.en.name) payload.en.name = req.body.en.name;
    if (req.body.en.title) payload.en.title = req.body.en.title;
    if (req.body.en.warranty) payload.en.warranty = req.body.en.warranty;

    if (req.body.en.description) {
      payload.en.description = normalizeDescriptionForLang(safeJSON(req.body.en.description));
    }

    if (req.body.en.specifications) {
      payload.en.specifications = normalizeSpecificationsForLang(safeJSON(req.body.en.specifications));
    }

    if (req.body.en.details) {
      payload.en.details = normalizeDetailsForLang(safeJSON(req.body.en.details));
    }

    if (req.body.en.features) {
      payload.en.features = Array.isArray(req.body.en.features) ? req.body.en.features : [];
    }

    if (req.body.en.reference || req.files?.reference) {
      payload.en.reference = normalizeReferenceForLang(req, 'en');
    }

    if (req.files?.images) {
      payload.en.images = normalizeImagesForLang(req, 'en');
    }
  }

  // Update Arabic localized fields if provided
  if (req.body.ar) {
    payload.ar = {};

    if (req.body.ar.name) payload.ar.name = req.body.ar.name;
    if (req.body.ar.title) payload.ar.title = req.body.ar.title;
    if (req.body.ar.warranty) payload.ar.warranty = req.body.ar.warranty;

    if (req.body.ar.description) {
      payload.ar.description = normalizeDescriptionForLang(safeJSON(req.body.ar.description));
    }

    if (req.body.ar.specifications) {
      payload.ar.specifications = normalizeSpecificationsForLang(safeJSON(req.body.ar.specifications));
    }

    if (req.body.ar.details) {
      payload.ar.details = normalizeDetailsForLang(safeJSON(req.body.ar.details));
    }

    if (req.body.ar.features) {
      payload.ar.features = Array.isArray(req.body.ar.features) ? req.body.ar.features : [];
    }

    if (req.body.ar.reference || req.files?.reference) {
      payload.ar.reference = normalizeReferenceForLang(req, 'ar');
    }

    if (req.files?.images) {
      payload.ar.images = normalizeImagesForLang(req, 'ar');
    }
  }

  // Update language-independent fields if provided
  if (req.body.sku) payload.sku = req.body.sku;
  if (req.body.modelNumber) payload.modelNumber = req.body.modelNumber;
  if (req.body.price !== undefined) payload.price = Number(req.body.price);
  if (req.body.discountPrice !== undefined) payload.discountPrice = Number(req.body.discountPrice);
  if (req.body.discountPercentage !== undefined) payload.discountPercentage = Number(req.body.discountPercentage);
  if (req.body.currencyCode) payload.currencyCode = req.body.currencyCode;
  if (req.body.stock !== undefined) payload.stock = Number(req.body.stock);
  if (req.body.status) payload.status = req.body.status;
  if (req.body.category) payload.category = req.body.category;
  if (req.body.brand) payload.brand = req.body.brand;

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