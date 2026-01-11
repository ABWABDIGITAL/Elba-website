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
/* ============================================================
   PRODUCT PAYLOAD NORMALIZATION (CREATE / UPDATE)
============================================================ */

// ---------- Helpers ----------
const isMeaningful = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true; // e.g. allow 0
};

const safeJSON = (value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    try {
      return JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }

  return undefined;
};

// ---------- Multilingual Field Normalizers ----------
const normalizeDescriptionForLang = (raw) => {
  const arr = safeJSON(raw);
  if (!Array.isArray(arr)) return undefined;
  const mapped = arr.map((item) => ({
    title: item?.title || "",
    content: item?.content || "",
  }));
  return mapped.length ? mapped : undefined;
};

const normalizeSpecificationsForLang = (raw) => {
  const arr = safeJSON(raw);
  if (!Array.isArray(arr)) return undefined;
  const mapped = arr.map((item) => ({
    key: item?.key || "",
    value: item?.value || "",
    unit: item?.unit || "",
    group: item?.group || "",
  }));
  return mapped.length ? mapped : undefined;
};

const normalizeDetailsForLang = (raw) => {
  const arr = safeJSON(raw);
  if (!Array.isArray(arr)) return undefined;
  const mapped = arr.map((item) => ({
    key: item?.key || "",
    value: item?.value || "",
  }));
  return mapped.length ? mapped : undefined;
};

const normalizeFeaturesForLang = (raw) => {
  const arr = safeJSON(raw);
  if (!Array.isArray(arr)) return undefined;
  const mapped = arr.map((item) => String(item));
  return mapped.length ? mapped : undefined;
};

// ---------- File / Image Normalizers ----------
const normalizeImagesGlobal = (req) => {
  if (!req.files?.images || !Array.isArray(req.files.images)) return undefined;

  return req.files.images.map((file) => ({
    url: `/uploads/products/images/${file.filename}`,
  }));
};


// ---------- Safe Assigner ----------
const assignIfValid = (target, key, rawValue, normalizer) => {
  if (!isMeaningful(rawValue)) return;
  const normalized = normalizer(rawValue);
  if (normalized !== undefined) {
    target[key] = normalized;
  }
};
const normalizeCatalogFile = (req) => {
  const file = req?.files?.catalog?.[0];
  if (!file) return undefined; // was previously: return {}
  
  return {
    pdfUrl: `/uploads/products/catalog/${file.filename}`,
  };
};

/* ============================================================
   🆕 normalizeCreatePayload
============================================================ */
export const normalizeCreatePayload = (req) => {
  const payload = {};

  // ---------- EN ----------
  payload.en = {
    title: req.body?.en?.title?.trim() || "",
    subTitle: req.body?.en?.subTitle || "",
    warranty: req.body?.en?.warranty || "",
    description: normalizeDescriptionForLang(req.body?.en?.description) || [],
    specifications: normalizeSpecificationsForLang(req.body?.en?.specifications) || [],
    details: normalizeDetailsForLang(req.body?.en?.details) || [],
    features: normalizeFeaturesForLang(req.body?.en?.features) || [],
  };

  // ---------- AR ----------
  payload.ar = {
    title: req.body?.ar?.title?.trim() || "",
    subTitle: req.body?.ar?.subTitle || "",
    warranty: req.body?.ar?.warranty || "",
    description: normalizeDescriptionForLang(req.body?.ar?.description) || [],
    specifications: normalizeSpecificationsForLang(req.body?.ar?.specifications) || [],
    details: normalizeDetailsForLang(req.body?.ar?.details) || [],
    features: normalizeFeaturesForLang(req.body?.ar?.features) || [],
  };

  // ---------- Catalog ----------
  const catalog = normalizeCatalogFile(req);
  if (catalog) {
    payload.en.catalog = catalog;
    payload.ar.catalog = catalog;
  }

  // ---------- Images ----------
  const images = normalizeImagesGlobal(req);
  if (images) {
    payload.images = images;
  }

  // ---------- Flat Fields ----------
  if (req.body.sku) payload.sku = req.body.sku.toUpperCase().trim();
  if (req.body.modelNumber) payload.modelNumber = req.body.modelNumber;

  if (req.body.price !== undefined && req.body.price !== "")
    payload.price = Number(req.body.price);

  if (req.body.discountPrice !== undefined && req.body.discountPrice !== "")
    payload.discountPrice = Number(req.body.discountPrice);

  if (
    req.body.discountPercentage !== undefined &&
    req.body.discountPercentage !== ""
  )
    payload.discountPercentage = Number(req.body.discountPercentage);

  if (req.body.currencyCode) payload.currencyCode = req.body.currencyCode;
  if (req.body.stock !== undefined) payload.stock = Number(req.body.stock);
  if (req.body.status) payload.status = req.body.status;
  if (req.body.category) payload.category = req.body.category;
  if (req.body.brand) payload.brand = req.body.brand;

  return payload;
};
/* ============================================================
   ✏️ normalizeUpdatePayload (PATCH SAFE)
============================================================ */
export const normalizeUpdatePayload = (req) => {
  const payload = {};

  // ---------- EN ----------
  if (req.body.en && typeof req.body.en === "object") {
    const en = {};

    if (isMeaningful(req.body.en.title)) en.title = req.body.en.title;
    if (isMeaningful(req.body.en.subTitle)) en.subTitle = req.body.en.subTitle;
    if (isMeaningful(req.body.en.warranty)) en.warranty = req.body.en.warranty;

    assignIfValid(en, "description", req.body.en.description, normalizeDescriptionForLang);
    assignIfValid(en, "specifications", req.body.en.specifications, normalizeSpecificationsForLang);
    assignIfValid(en, "details", req.body.en.details, normalizeDetailsForLang);
    assignIfValid(en, "features", req.body.en.features, normalizeFeaturesForLang);

    if (Object.keys(en).length > 0) payload.en = en;
  }

  // ---------- AR ----------
  if (req.body.ar && typeof req.body.ar === "object") {
    const ar = {};

    if (isMeaningful(req.body.ar.title)) ar.title = req.body.ar.title;
    if (isMeaningful(req.body.ar.subTitle)) ar.subTitle = req.body.ar.subTitle;
    if (isMeaningful(req.body.ar.warranty)) ar.warranty = req.body.ar.warranty;

    assignIfValid(ar, "description", req.body.ar.description, normalizeDescriptionForLang);
    assignIfValid(ar, "specifications", req.body.ar.specifications, normalizeSpecificationsForLang);
    assignIfValid(ar, "details", req.body.ar.details, normalizeDetailsForLang);
    assignIfValid(ar, "features", req.body.ar.features, normalizeFeaturesForLang);

    if (Object.keys(ar).length > 0) payload.ar = ar;
  }

  // ---------- Catalog ----------
const catalog = normalizeCatalogFile(req);
if (catalog !== undefined) {
  payload.en = payload.en || {};
  payload.ar = payload.ar || {};
  payload.en.catalog = catalog;
  payload.ar.catalog = catalog;
}

  // ---------- Images ----------
  const images = normalizeImagesGlobal(req);
  if (Array.isArray(images) && images.length > 0) {
    payload.images = images;
  }

  // ---------- Flat Fields ----------
  if (isMeaningful(req.body.sku)) payload.sku = req.body.sku.toUpperCase().trim();
  if (isMeaningful(req.body.modelNumber)) payload.modelNumber = req.body.modelNumber;
  if (isMeaningful(req.body.price)) payload.price = Number(req.body.price);
  if (isMeaningful(req.body.discountPrice)) payload.discountPrice = Number(req.body.discountPrice);
  if (isMeaningful(req.body.discountPercentage)) payload.discountPercentage = Number(req.body.discountPercentage);
  if (isMeaningful(req.body.currencyCode)) payload.currencyCode = req.body.currencyCode;
  if (isMeaningful(req.body.stock)) payload.stock = Number(req.body.stock);
  if (isMeaningful(req.body.status)) payload.status = req.body.status;
  if (isMeaningful(req.body.category)) payload.category = req.body.category;
  if (isMeaningful(req.body.brand)) payload.brand = req.body.brand;

  return payload;
};
// // CREATE
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
