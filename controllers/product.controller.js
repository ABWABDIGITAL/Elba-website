// controllers/product.controller.js
import {
  createProductService,
  updateProductService,
  deleteProductService,
  getAllProductsService,
  getProductByslugService,
  getCompareProductsService,
  getBestSellingByCategoryService,
  getBestOffersService,
  getProductsByCategory,
  getProductsByTagService,
  getProductsByTagsService,
  getAvailableTagsService,
  bulkUpdateProductTagsService,
  getCategoryAndProductsByType,
  getProductByCatalogService,
  searchProducts,
  getAllProductsForAdminService
} from "../services/product.services.js";

import { StatusCodes } from "http-status-codes";
import { ServerError } from "../utlis/apiError.js";
import Product from "../models/product.model.js";
/* -----------------------------------------------------
   INTERNAL HELPERS
----------------------------------------------------- */

const safeJSON = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

// description: [{ title, content }]
const normalizeDescriptionForLang = (raw) => {
  const arr = safeJSON(raw);
  if (!Array.isArray(arr)) return [];

  return arr.map((item) => ({
    title: item?.title || "",
    content: item?.content || "",
  }));
};

// specifications: [{ key, value, unit, group }]
const normalizeSpecificationsForLang = (raw) => {
  const arr = safeJSON(raw);
  if (!Array.isArray(arr)) return [];

  return arr.map((item) => ({
    key: item?.key || "",
    value: item?.value || "",
    unit: item?.unit || "",
    group: item?.group || "",
  }));
};

// details: [{ key, value }]
const normalizeDetailsForLang = (raw) => {
  const arr = safeJSON(raw);
  if (!Array.isArray(arr)) return [];

  return arr.map((item) => ({
    key: item?.key || "",
    value: item?.value || "",
  }));
};

// features: [string]
const normalizeFeaturesForLang = (raw) => {
  const arr = safeJSON(raw);
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => String(item));
};




// images: GLOBAL ONLY
const normalizeImagesGlobal = (req) => {
  if (!req.files?.images || !Array.isArray(req.files.images)) return [];
  return req.files.images.map((file) => ({
    url: `/uploads/products/images/${file.filename}`,
  }));
};

/* -----------------------------------------------------
   PAYLOAD NORMALIZATION FOR CREATE / UPDATE
----------------------------------------------------- */

const normalizeCreatePayload = (req) => {
  const payload = {};

  // ---------- EN ----------
  payload.en = {
    title: req.body?.en?.title || "",
    subTitle: req.body?.en?.subTitle || "",
    warranty: req.body?.en?.warranty || "",
  };

  if (req.body?.en?.description) {
    payload.en.description = normalizeDescriptionForLang(req.body.en.description);
  }

  if (req.body?.en?.specifications) {
    payload.en.specifications = normalizeSpecificationsForLang(
      req.body.en.specifications
    );
  }

  if (req.body?.en?.details) {
    payload.en.details = normalizeDetailsForLang(req.body.en.details);
  }

  if (req.body?.en?.features) {
    payload.en.features = normalizeFeaturesForLang(req.body.en.features);
  }

  // ---------- AR ----------
  payload.ar = {
    title: req.body?.ar?.title || "",
    subTitle: req.body?.ar?.subTitle || "",
    warranty: req.body?.ar?.warranty || "",
  };

  if (req.body?.ar?.description) {
    payload.ar.description = normalizeDescriptionForLang(req.body.ar.description);
  }

  if (req.body?.ar?.specifications) {
    payload.ar.specifications = normalizeSpecificationsForLang(
      req.body.ar.specifications
    );
  }

  if (req.body?.ar?.details) {
    payload.ar.details = normalizeDetailsForLang(req.body.ar.details);
  }

  if (req.body?.ar?.features) {
    payload.ar.features = normalizeFeaturesForLang(req.body.ar.features);
  }

  // ---------- catalog (same file للغتين) ----------
const catalog = normalizeCatalogFile(req);
if (catalog) {
  payload.en = payload.en || {};
  payload.ar = payload.ar || {};
  payload.en.catalog = catalog;
  payload.ar.catalog = catalog;
}


  // ---------- Global images ----------
  const images = normalizeImagesGlobal(req);
  if (images.length) {
    payload.images = images;
  }

  // ---------- Language-independent ----------
  if (req.body.sku) payload.sku = String(req.body.sku).toUpperCase().trim();
  if (req.body.modelNumber) payload.modelNumber = req.body.modelNumber;

    if (req.body.price !== undefined && req.body.price !== "" && !isNaN(req.body.price)) {
      payload.price = Number(req.body.price);
    }


  // discountPrice = discount VALUE (قيمة الخصم)
  if (req.body.discountPrice !== undefined && req.body.discountPrice !== "" && !isNaN(req.body.discountPrice)) {
    payload.discountPrice = Number(req.body.discountPrice);
  }


  if (req.body.discountPercentage !== undefined) {
    payload.discountPercentage = Number(req.body.discountPercentage);
  }

  if (req.body.currencyCode) payload.currencyCode = req.body.currencyCode;
  if (req.body.stock !== undefined) payload.stock = Number(req.body.stock);
  if (req.body.status) payload.status = req.body.status;
  if (req.body.category) payload.category = req.body.category;
  if (req.body.brand) payload.brand = req.body.brand;

  return payload;
};
const normalizeCatalogFile = (req) => {
  const file = req?.files?.catalog?.[0];
  if (!file) return null;

  return {
    pdfUrl: `/uploads/products/catalog/${file.filename}`
  };
};


const normalizeUpdatePayload = (req) => {
  const payload = {};

// ---------- EN ----------
if (req.body.en && Object.keys(req.body.en).length > 0) {
  const en = {};

  if (req.body.en.title !== undefined) en.title = req.body.en.title;
  if (req.body.en.subTitle !== undefined) en.subTitle = req.body.en.subTitle;
  if (req.body.en.warranty !== undefined) en.warranty = req.body.en.warranty;

  if (req.body.en.description !== undefined) {
    en.description = normalizeDescriptionForLang(req.body.en.description);
  }

  if (req.body.en.specifications !== undefined) {
    en.specifications = normalizeSpecificationsForLang(
      req.body.en.specifications
    );
  }

  if (req.body.en.details !== undefined) {
    en.details = normalizeDetailsForLang(req.body.en.details);
  }

  if (req.body.en.features !== undefined) {
    en.features = normalizeFeaturesForLang(req.body.en.features);
  }

  if (Object.keys(en).length > 0) {
    payload.en = en;
  }
}

  // ---------- AR ----------
 if (req.body.ar && Object.keys(req.body.ar).length > 0) {
  const ar = {};

  if (req.body.ar.title !== undefined) ar.title = req.body.ar.title;
  if (req.body.ar.subTitle !== undefined) ar.subTitle = req.body.ar.subTitle;
  if (req.body.ar.warranty !== undefined) ar.warranty = req.body.ar.warranty;

  if (req.body.ar.description !== undefined) {
    ar.description = normalizeDescriptionForLang(req.body.ar.description);
  }

  if (req.body.ar.specifications !== undefined) {
    ar.specifications = normalizeSpecificationsForLang(
      req.body.ar.specifications
    );
  }

  if (req.body.ar.details !== undefined) {
    ar.details = normalizeDetailsForLang(req.body.ar.details);
  }

  if (req.body.ar.features !== undefined) {
    ar.features = normalizeFeaturesForLang(req.body.ar.features);
  }

  if (Object.keys(ar).length > 0) {
    payload.ar = ar;
  }
}


  const catalog = normalizeCatalogFile(req);
  if (catalog) {
    payload.en = payload.en || {};
    payload.ar = payload.ar || {};
    payload.en.catalog = catalog;
    payload.ar.catalog = catalog;
  }
  // ---------- Global images update ----------
  const images = normalizeImagesGlobal(req);
  if (images.length) {
    payload.images = images; // overwrite بالكامل
  }

  // ---------- Language-independent ----------
  if (req.body.sku !== undefined)
    payload.sku = String(req.body.sku).toUpperCase().trim();
  if (req.body.modelNumber !== undefined)
    payload.modelNumber = req.body.modelNumber;

  if (req.body.price !== undefined) {
    payload.price = Number(req.body.price);
  }

  if (req.body.discountPrice !== undefined) {
    payload.discountPrice = Number(req.body.discountPrice);
  }

  if (req.body.discountPercentage !== undefined) {
    payload.discountPercentage = Number(req.body.discountPercentage);
  }

  if (req.body.currencyCode !== undefined)
    payload.currencyCode = req.body.currencyCode;
  if (req.body.stock !== undefined) payload.stock = Number(req.body.stock);
  if (req.body.status !== undefined) payload.status = req.body.status;
  if (req.body.category !== undefined) payload.category = req.body.category;
  if (req.body.brand !== undefined) payload.brand = req.body.brand;
console.log("FILES:", req.files);

  return payload;
};

/* -----------------------------------------------------
   CONTROLLERS
----------------------------------------------------- */

// CREATE
export const createProductController = async (req, res, next) => {
  try {
    const normalized = normalizeCreatePayload(req);
    const result = await createProductService(normalized);

    res.status(StatusCodes.CREATED).json(result);
  } catch (err) {
    next(err);
  }
};

// UPDATE
export const updateProductController = async (req, res, next) => {
  try {
    const normalized = normalizeUpdatePayload(req);
    const result = await updateProductService(req.params.slug, normalized);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// DELETE
export const deleteProductController = async (req, res, next) => {
  try {
    const result = await deleteProductService(req.params.slug);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// LIST + FILTER + PAGINATION
export const getAllProductsController = async (req, res, next) => {
  try {
    const result = await getAllProductsService(req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};


export const getAllProductsforAdminController = async (req, res, next) => {
  try {
    const result = await getAllProductsForAdminService(req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// GET SINGLE PRODUCT BY SKU
export const getProductBySlugController = async (req, res, next) => {
  try {
    const result = await getProductByslugService(req , req.params.slug);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};
export const getProductByCatalogController = async (req, res, next) => {
  try {
    const result = await getProductByCatalogService(req.params.keyword);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};
export const searchProductsController = async (req, res, next) => {
  try {
    const result = await searchProducts(req.query);

    res.status(200).json({
      status: "success",
      results: result.products.length,
      pagination: result.pagination,
      data: result.products,
    });
  } catch (error) {
    next(error);
  }
};
export const uploadProductManual = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log("DEBUG FILE:", req.file);
    console.log("DEBUG BODY:", req.body);
    console.log("DEBUG PARAMS:", req.params);

    if (!req.file) {
      throw BadRequest("PDF file 'manual' is required");
    }

    const pdfUrl = `/uploads/products/manuals/${req.file.filename}`;

    const updated = await Product.findByIdAndUpdate(
      id,
      {
        "ar.catalog.pdfUrl": pdfUrl,
        "en.catalog.pdfUrl": pdfUrl,
      },
      { new: true }
    );

    if (!updated) throw NotFound("Product not found");

    res.json({
      OK: true,
      message: "User manual uploaded successfully",
      data: { pdfUrl },
    });

  } catch (err) {
    console.error("UPLOAD MANUAL ERROR FULL:", err);
    console.error("UPLOAD MANUAL ERROR MESSAGE:", err.message);
    console.error("UPLOAD MANUAL ERROR NAME:", err.name);

    next(ServerError("Failed to upload user manual", err));
  }
};

// COMPARE PRODUCTS BY SKU
export const getCompareProductsController = async (req, res, next) => {
  try {
    const skusParam = req.query.skus;
    console.log("DEBUG SKUS PARAM:", skusParam);
    const skus =
      typeof skusParam === "string"
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

// BEST SELLING BY CATEGORY (WITH FULL TREE)
export const getBestSellingByCategoryController = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const result = await getBestSellingByCategoryService(categoryId, req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// BEST OFFERS
export const getBestOffersController = async (req, res, next) => {
  try {
    const result = await getBestOffersService(req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// GET PRODUCTS BY CATALOG
export const getProductsByCategoryController = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const result = await getProductsByCategory(slug);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// GET PRODUCTS BY SINGLE TAG
export const getProductsByTag = async (req, res, next) => {
  try {
    const { tag } = req.params;
    const result = await getProductsByTagService(tag, req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};
export const getCategoryWithProductsController = async (req, res) => {
  try {
    const { type } = req.params;

    const data = await getCategoryAndProductsByType(type);

    return res.status(200).json({
      success: true,
      message: `Categories and products for type: ${type}`,
      data,
    });

  } catch (error) {
    console.error("Controller Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
// GET PRODUCTS BY MULTIPLE TAGS
export const getProductsByTags = async (req, res, next) => {
  try {
    const { tags } = req.query;
    if (!tags) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        OK: false,
        message: "Tags query parameter is required",
      });
    }
    const result = await getProductsByTagsService(tags, req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// GET ALL AVAILABLE TAGS
export const getAvailableTags = async (req, res, next) => {
  try {
    const result = await getAvailableTagsService();
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

// BULK UPDATE PRODUCT TAGS
export const bulkUpdateProductTags = async (req, res, next) => {
  try {
    const { productIds, tagsToAdd, tagsToRemove } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        OK: false,
        message: "productIds array is required",
      });
    }

    const result = await bulkUpdateProductTagsService(
      productIds,
      tagsToAdd,
      tagsToRemove
    );
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};
