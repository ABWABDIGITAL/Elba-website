import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import Tag from "../models/tag.model.js";
import mongoose from "mongoose";
import ApiError, {
  BadRequest,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";
import slugify from "slugify";
import { trackProductView } from '../services/analytics.services.js';
import { RedisHelper } from "../config/redis.js";
import { toAbsoluteUrl } from "../utlis/urlHelper.js";
import XLSX from "xlsx";
import { queueProductForEmbedding, queueProductsForEmbedding } from "./embeddingQueue.services.js";
 const HOME_CACHE_KEY = "home:page";
 const HOME_CACHE_TTL = 3600;

/* =========================================================================
   URL & DTO TRANSFORM HELPERS
=========================================================================== */
const transformImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images.map((img) => ({
    ...img,
    url: toAbsoluteUrl(img.url),
  }));
};

const transformBrandLogo = (brand) => {
  if (!brand) return null;
  return {
    ...brand,
    logo: toAbsoluteUrl(brand.logo),
  };
};

const transformCategoryImage = (category) => {
  if (!category) return null;
  return {
    ...category,
    image: toAbsoluteUrl(category.image),
  };
};

const transformCatalog = (catalog) => {
  if (!catalog) return null;
  return {
    ...catalog,
    pdfUrl: toAbsoluteUrl(catalog?.pdfUrl),
  };
};

const transformTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => {
    if (!t || typeof t !== "object" || !t._id) return t;
    return {
      id: t._id,
      name: t.name,
      slug: t.slug,
      type: t.type,
      icon: t.icon ? toAbsoluteUrl(t.icon) : null,
    };
  });
};

/**
 * Build standardized pricing block (works with both lean and non-lean docs).
 */
const buildPricingDTO = (p) => {
  const price = p.price || 0;
  const discountPercentage = p.discountPercentage || 0;
  const discountPrice = p.discountPrice || 0;
  const discountedPrice =
    discountPrice > 0 && discountPrice < price
      ? Number((price - discountPrice).toFixed(2))
      : price;
  const taxPercentage = p.taxPercentage ?? 15;
  const taxAmount = Number(((discountedPrice * taxPercentage) / 100).toFixed(2));
  const finalPrice = Number((discountedPrice + taxAmount).toFixed(2));

  return {
    price,
    discountPercentage,
    discountedPrice,
    taxPercentage,
    taxAmount,
    finalPrice,
  };
};

export const buildCompareDTO = (p) => {
  if (!p) return null;
  const pricing = buildPricingDTO(p);
  return {
    id: p._id,
    ar: {
      specifications: p.ar?.specifications,
      features: p.ar?.features,
      warranty: p.ar?.warranty,
      seo: p.ar?.seo,
    },
    en: {
      specifications: p.en?.specifications,
      features: p.en?.features,
      warranty: p.en?.warranty,
      reference: p.en?.reference,
      seo: p.en?.seo,
    },
    images: transformImages(p.images),
    sku: p.sku,
    slug: p.slug,
    ...pricing,
    discountPrice: p.discountPrice || 0,
    stock: p.stock,
    colors: p.colors || [],
    brand: p.brand?._id
      ? transformBrandLogo(typeof p.brand.toObject === "function" ? p.brand.toObject() : p.brand)
      : p.brand,
    ratingsAverage: p.ratingsAverage,
    ratingsQuantity: p.ratingsQuantity,
    tags: transformTags(p.tags),
  };
};

export const buildGetAllproductDTO = (p) => {
  if (!p) return null;
  const pricing = buildPricingDTO(p);
  return {
    id: p._id,
    ar: { title: p.ar?.title },
    en: { title: p.en?.title },
    images: transformImages(p.images),
    sku: p.sku,
    slug: p.slug,
    ...pricing,
    discountPrice: p.discountPrice || 0,
    ratingsAverage: p.ratingsAverage,
    sizeType: p.sizeType || null,
    stock: p.stock,
    status: p.status,
    salesCount: p.salesCount,
    colors: p.colors || [],
    hasInstallation: p.hasInstallation || false,
    hasDelivery: p.hasDelivery ?? true,
    tags: transformTags(p.tags),

    category: p.category
      ? {
          id: p.category._id,
          ar: p.category.ar,
          en: p.category.en,
          image: toAbsoluteUrl(p.category.image),
        }
      : null,

    brand: p.brand
      ? {
          id: p.brand._id,
          ar: p.brand.ar,
          en: p.brand.en,
          logo: toAbsoluteUrl(p.brand.logo),
        }
      : null,
  };
};


export const buildProductDTO = (p) => {
  if (!p) return null;
  const pricing = buildPricingDTO(p);
  return {
    id: p._id,
    ar: {
      title: p.ar?.title,
      subTitle: p.ar?.subTitle,
      features: p.ar?.features,
      specifications: p.ar?.specifications,
      warranty: p.ar?.warranty,
      description: p.ar?.description,
      details: p.ar?.details,
      catalog: transformCatalog(p.ar?.catalog),
      seo: p.ar?.seo,
    },
    en: {
      title: p.en?.title,
      subTitle: p.en?.subTitle,
      features: p.en?.features,
      specifications: p.en?.specifications,
      warranty: p.en?.warranty,
      description: p.en?.description,
      details: p.en?.details,
      catalog: transformCatalog(p.en?.catalog),
      seo: p.en?.seo,
    },
    images: transformImages(p.images),
    sku: p.sku,
    slug: p.slug,
    ...pricing,
    discountPrice: p.discountPrice || 0,
    currencyCode: p.currencyCode || "SAR",
    stock: p.stock,
    status: p.status,
    category: p.category?._id
      ? transformCategoryImage(typeof p.category.toObject === "function" ? p.category.toObject() : p.category)
      : p.category,
    brand: p.brand?._id
      ? transformBrandLogo(typeof p.brand.toObject === "function" ? p.brand.toObject() : p.brand)
      : p.brand,
    colors: p.colors || [],
    hasInstallation: p.hasInstallation || false,
    hasDelivery: p.hasDelivery ?? true,
    installationPrice: p.installationPrice || 0,
    tags: transformTags(p.tags),
    ratingsAverage: p.ratingsAverage,
    ratingsQuantity: p.ratingsQuantity,
    installments: p.installments,
    views: p.views,
    sizeType: p.sizeType,
    salesCount: p.salesCount,
    isFav: p.isFav,
  };
};
export const buildGetCatalogProductDTO = (p) => {
  if (!p) return null;
  return {
    id: p._id,
    ar: {
      title: p.ar?.title,
      subTitle: p.ar?.subTitle,
      catalog: transformCatalog(p.ar?.catalog),
    },
    en: {
      title: p.en?.title,
      subTitle: p.en?.subTitle,
      catalog: transformCatalog(p.en?.catalog),
    },
    images: transformImages(p.images),
    sku: p.sku,
    slug: p.slug,
    ratingsAverage: p.ratingsAverage,
  };
};

export const validateProductDomain = (product) => {
  const errors = [];

  if (product.price < 0) errors.push("price must be >= 0");
  if (product.discountPercentage < 0 || product.discountPercentage > 100)
    errors.push("discountPercentage must be between 0 and 100");
  if (product.stock < 0) errors.push("stock must be >= 0");
  if (product.discountPrice < 0) errors.push("discountPrice must be >= 0");
  if (product.discountPrice > product.price)
    errors.push("discountPrice cannot be greater than price");

  if (errors.length) throw BadRequest("Product validation failed", errors);
};

const applySlugIfMissing = (data) => {
  if (!data.slug && data.sku) {
    data.slug = slugify(String(data.sku), { lower: true, strict: true });
  }
};

function applyPricingLogic(data) {
  const price = data.price;
  if (price == null) return;

  // Percentage-based discount (source of truth)
  if (data.discountPercentage != null && data.discountPercentage > 0) {
    if (data.discountPercentage < 0) data.discountPercentage = 0;
    if (data.discountPercentage > 100) data.discountPercentage = 100;

    data.discountPrice = Number(
      ((price * data.discountPercentage) / 100).toFixed(2)
    );
    return;
  }

  // Backward compat: if discountPrice sent directly (e.g. bulk import), convert to percentage
  if (data.discountPrice != null && data.discountPrice > 0) {
    if (data.discountPrice > price) data.discountPrice = price;
    data.discountPercentage = Number(
      ((data.discountPrice / price) * 100).toFixed(2)
    );
    data.discountPrice = Number(
      ((price * data.discountPercentage) / 100).toFixed(2)
    );
    return;
  }

  // No discount
  data.discountPrice = 0;
  data.discountPercentage = 0;
}

/**
 * Auto-attach or detach the "special_offer" tag based on discountPercentage.
 */
async function syncSpecialOfferTag(product) {
  const specialOfferTag = await Tag.findOne({ automationKey: "special_offer" });
  if (!specialOfferTag) return;

  const tagId = specialOfferTag._id.toString();
  const currentTags = (product.tags || []).map((t) => t.toString());
  const hasTag = currentTags.includes(tagId);
  const shouldHaveTag = product.discountPercentage > 0;

  if (shouldHaveTag && !hasTag) {
    product.tags.push(specialOfferTag._id);
  } else if (!shouldHaveTag && hasTag) {
    product.tags = product.tags.filter((t) => t.toString() !== tagId);
  }
}

export const createProductService = async (data) => {
  try {
    const exists = await Product.findOne({ sku: data.sku });
    if (exists) throw BadRequest("SKU already exists");

    applySlugIfMissing(data);
    applyPricingLogic(data);

    const product = new Product(data);
    validateProductDomain(product);

    await syncSpecialOfferTag(product);
    await product.save();

    // Populate tags for response
    await product.populate("tags", "name slug type icon");
    await product.populate("category", "ar.name ar.slug en.name en.slug image");
    await product.populate("brand", "ar.name ar.slug en.name en.slug logo");

    await RedisHelper.del(HOME_CACHE_KEY);

    // Queue async embedding generation for chatbot
    queueProductForEmbedding(product._id).catch((err) =>
      console.error("[Embedding] Queue error on create:", err.message)
    );

    return {
      OK: true,
      message: "Product created successfully",
      data: buildProductDTO(product),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to create product", {
      message: err.message,
      name: err.name,
    });
  }
};

const deepMerge = (target, source) => {
  const isObject = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj);
  
  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = deepMerge({ ...targetValue }, sourceValue);
    } else if (sourceValue !== undefined) {
      target[key] = sourceValue;
    }
  });

  return target;
};

export const updateProductService = async (slug, data) => {
  try {
    const product = await Product.findOne({ slug });
    if (!product) throw NotFound("Product not found");

    // Create a copy of the existing document
    const updatedProduct = product.toObject();

    // Deep merge the updates with the existing document
    deepMerge(updatedProduct, data);

    // Apply the merged data back to the product
    for (const key in updatedProduct) {
      if (key !== '_id' && key !== '__v') {
        product.set(key, updatedProduct[key]);
      }
    }

    applySlugIfMissing(product);

    if (
      data.price != null ||
      data.discountPrice != null ||
      data.discountPercentage != null
    ) {
      applyPricingLogic(product);
    }

    validateProductDomain(product);
    await syncSpecialOfferTag(product);

    await product.save();

    // Populate tags for response
    await product.populate("tags", "name slug type icon");
    await product.populate("category", "ar.name ar.slug en.name en.slug image");
    await product.populate("brand", "ar.name ar.slug en.name en.slug logo");

    await RedisHelper.del(HOME_CACHE_KEY);

    // Queue async embedding re-generation for chatbot
    queueProductForEmbedding(product._id).catch((err) =>
      console.error("[Embedding] Queue error on update:", err.message)
    );

    return {
      OK: true,
      message: "Product updated successfully",
      data: buildProductDTO(product),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to update product", err.message);
  }
};


export const deleteProductService = async (slug) => {
  try {
    const deleted = await Product.findOneAndDelete({ slug });

    if (!deleted) throw NotFound("Product not found");
    await RedisHelper.del(HOME_CACHE_KEY);
    return {
      OK: true,
      message: "Product deleted successfully",
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to delete product", err);
  }
};

export const getAllProductsService = async (query) => {
  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.brand) filter.brand = query.brand;

    // Color filter
    if (query.color) {
      const colors = query.color.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
      if (colors.length) filter.colors = { $in: colors };
    }

    // Price range filter
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }

    // Tag filter (by ObjectId)
    if (query.tag) {
      const tagIds = query.tag.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagIds.length) filter.tags = { $in: tagIds };
    }

    // Boolean filters
    if (query.hasInstallation !== undefined) {
      filter.hasInstallation = query.hasInstallation === "true";
    }
    if (query.hasDelivery !== undefined) {
      filter.hasDelivery = query.hasDelivery === "true";
    }
    if (query.status) filter.status = query.status;

    // Full text search (ar + en)
    if (query.keyword) {
      const kw = query.keyword.trim();
      if (kw) {
        const regex = { $regex: kw, $options: "i" };
        filter.$or = [
          { "ar.title": regex },
          { "ar.subTitle": regex },
          { "en.title": regex },
          { "en.subTitle": regex },
          { sku: regex },
          { slug: regex },
        ];
      }
    }

    const selectFields =
      "en.title en.subTitle ar.title ar.subTitle price discountPrice discountPercentage taxPercentage sizeType ratingsAverage images sku slug status stock salesCount category brand tags colors hasInstallation hasDelivery";

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select(selectFields)
        .populate("category", "ar.name ar.slug en.name en.slug image")
        .populate("brand", "ar.name ar.slug en.name en.slug logo")
        .populate("tags", "name slug type icon")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(filter),
    ]);

    return {
      OK: true,
      message: "Products fetched successfully",
      data: items.map(buildGetAllproductDTO),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    throw ServerError("Failed to get products", err);
  }
};
export const getAllProductsForAdminService = async (query) => {
  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.brand) filter.brand = query.brand;
    if (query.status) filter.status = query.status;

    // Full text search (ar + en)
    if (query.keyword) {
      const kw = query.keyword.trim();
      if (kw) {
        const regex = { $regex: kw, $options: "i" };
        filter.$or = [
          { "ar.title": regex },
          { "ar.subTitle": regex },
          { "en.title": regex },
          { "en.subTitle": regex },
          { sku: regex },
          { slug: regex },
        ];
      }
    }

    const selectFields =
      "en.title en.subTitle ar.title ar.subTitle price discountPrice discountPercentage taxPercentage sizeType ratingsAverage images sku slug status stock salesCount category brand tags colors hasInstallation hasDelivery";

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select(selectFields)
        .populate("category", "ar.name ar.slug en.name en.slug image")
        .populate("brand", "ar.name ar.slug en.name en.slug logo")
        .populate("tags", "name slug type icon")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    return {
      OK: true,
      message: "Products fetched successfully",
      data: items.map(buildGetAllproductDTO),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    throw ServerError("Failed to get products", err);
  }
};
    
export const getProductByslugService = async (req, slug) => {
  const product = await Product.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate("category", "ar.name ar.slug en.name en.slug image")
    .populate("brand", "ar.name ar.slug en.name en.slug logo")
    .populate("tags", "name slug type icon");

  if (!product) throw NotFound("Product not found");

  const similarProducts = await Product.find({
    category: product.category?._id || null,
    _id: { $ne: product._id },
    status: "active",
  })
    .populate("category", "ar.name ar.slug en.name en.slug image")
    .populate("brand", "ar.name ar.slug en.name en.slug logo")
    .populate("tags", "name slug type icon")
    .limit(10)
    .sort({ ratingsAverage: -1, salesCount: -1 });

  await trackProductView(req, product);
  return {
    OK: true,
    message: "Product fetched successfully",
    data: buildProductDTO(product),
    similarProducts: similarProducts.map(buildGetAllproductDTO),
  };
};
export const getProductByBrandService = async (slug) => {
  const brand = await Brand.findOne({
    $or: [
      { "en.slug": slug },
      { "ar.slug": slug }
    ]
  });

  if (!brand) {
    return {
      OK: true,
      message: "Products fetched successfully",
      data: [],
    };
  }

  const products = await Product.find({ brand: brand._id })
    .populate("category", "ar.name ar.slug en.name en.slug image")
    .populate("brand", "ar.name ar.slug en.name en.slug logo")
    .populate("tags", "name slug type icon");

  return {
    OK: true,
    message: "Products fetched successfully",
    data: products.map(buildGetAllproductDTO),
  };
};


export const getProductByCatalogService = async (keyword) => {
  const products = await Product.find({
    $or: [
      { "en.title": { $regex: keyword, $options: "i" } },
      { "ar.title": { $regex: keyword, $options: "i" } }
    ]
  });

  if (!products || products.length === 0) throw NotFound("No products found");

  return {
    OK: true,
    message: "Products fetched successfully",
    data: products.map(buildGetCatalogProductDTO),
  };
};

export const getCategoryAndProductsByType = async (categoryType) => {
  if (!categoryType) {
    throw new Error("categoryType is required");
  }

  // enforce valid types
  const allowedTypes = ["Large", "Small"];
  if (!allowedTypes.includes(categoryType)) {
    throw new Error(
      `Invalid category type. Allowed: ${allowedTypes.join(", ")}`
    );
  }

  try {
    const data = await Category.aggregate([
      { $match: { type: categoryType } },

      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },

      // optional: sorting
      {
        $addFields: {
          products: {
            $sortArray: {
              input: "$products",
              sortBy: { createdAt: -1 },
            },
          },
        },
      },
    ]);

    return data;
  } catch (err) {
    console.error("Error in getCategoryAndProductsByType:", err);
    throw new Error("Internal server error");
  }
};
export const getCompareProductsService = async (skus) => {
  try {
    const products = await Product.find({ sku: { $in: skus } })
      .populate("category", "ar.name ar.slug en.name en.slug image")
      .populate("brand", "ar.name ar.slug en.name en.slug logo")
      .populate("tags", "name slug type icon")

    if (!products.length) throw NotFound("Products not found");

    return {
      OK: true,
      message: "Products fetched successfully",
      data: products.map(buildCompareDTO),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get products", err);
  }
};

const getCategoryTreeIds = async (rootCategoryId) => {
  const ids = new Set();
  const queue = [rootCategoryId];

  while (queue.length) {
    const current = queue.shift();
    const currentId = current.toString();
    if (ids.has(currentId)) continue;

    ids.add(currentId);

    const children = await Category.find({ parent: current }).select("_id");
    children.forEach((c) => queue.push(c._id));
  }

  return Array.from(ids);
};

export const searchProducts = async (queryString) => {
  // Base query
  const baseQuery = Product.find({ status: "active" });

  // Apply API features
  const features = new ApiFeatures(baseQuery, queryString, {
    allowedFilterFields: [
      "price",
      "category",
      "brand",
      "tags",
      "stock",
    ],
    searchFields: [
      "en.title",
      "en.subTitle",
      "ar.title",
      "ar.subTitle",
      "slug",
      "sku",
    ],
    arraySearchFields: ["tags"],
  })
    .filter()
    .search()
    .sort()
    .limitFields()
    .paginate();

  // Execute main query
  const products = await features.mongooseQuery;

  // Count total for pagination
  const total = await Product.countDocuments(features.getFilter());

  const pagination = features.buildPaginationResult(total);

  return {
    products,
    pagination,
  };
};

export const getBestSellingByCategoryService = async (categoryId, query) => {
  try {
    const { top } = query;

    const categoryIds = await getCategoryTreeIds(categoryId);

    let mongooseQuery = Product.find({ category: { $in: categoryIds } })
      .populate("category", "ar.name ar.slug en.name en.slug image")
      .populate("brand", "ar.name ar.slug en.name en.slug logo")
      .populate("tags", "name slug type icon")

    if (top) {
      const items = await mongooseQuery
        .sort("-salesCount -views -ratingsQuantity")
        .limit(Number(top) || 10);

      return {
        OK: true,
        message: "Top best selling products fetched successfully",
        data: items.map(buildGetAllproductDTO),
      };
    }

    const features = new ApiFeatures(mongooseQuery, query, {
      allowedFilterFields: ["brand", "status"],
      searchFields: ["en.title", "ar.title", "sku"],
    })
      .filter()
      .search()
      .limitFields()
      .paginate();

    features.mongooseQuery = features.mongooseQuery.sort(
      "-salesCount -views -ratingsQuantity"
    );

    const items = await features.mongooseQuery;
    const total = await Product.countDocuments({
      ...features.getFilter(),
      category: { $in: categoryIds },
    });

    return {
      OK: true,
      message: "Best selling products fetched successfully",
      data: items.map(buildProductDTO),
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get best selling products", err);
  }
};

export const getBestOffersService = async (query) => {
  try {
    const { top } = query;

    let mongooseQuery = Product.find({})
      .populate("category", "ar.name ar.slug en.name en.slug image")
      .populate("brand", "ar.name ar.slug en.name en.slug logo")
      .populate("tags", "name slug type icon")

    if (top) {
      const items = await mongooseQuery
        .sort({ discountPercentage: -1 })
        .limit(Number(top) || 10);

      return {
        OK: true,
        message: "Top best offers fetched successfully",
        data: items.map(buildGetAllproductDTO),
      };
    }

    const features = new ApiFeatures(mongooseQuery, query, {
      allowedFilterFields: ["category", "brand", "status"],
      searchFields: ["en.title", "ar.title", "sku"],
    })
      .filter()
      .search()
      .limitFields()
      .paginate();

    features.mongooseQuery = features.mongooseQuery.sort({ discountPercentage: -1 });

    const items = await features.mongooseQuery;
    const total = await Product.countDocuments(features.getFilter());

    return {
      OK: true,
      message: "Best offers fetched successfully",
      data: items.map(buildProductDTO),
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get best offers", err);
  }
};

export const getProductsByCategory = async (slug) => {
  try {
    if (!slug) throw BadRequest("slug is required");

    console.log("Finding category by slug...", slug);

    const category = await Category.findOne({
      $or: [
        { "en.slug": slug },
        { "ar.slug": slug }
      ]
    })
      .lean();

    console.log("Category result:", category);

    if (!category) {
      throw NotFound("Category not found");
    }

    console.log("Finding products for category:", slug);

    const products = await Product.find({
      category: category._id,
    })
      .select(
        "en.title en.subTitle ar.title ar.subTitle price discountPrice discountPercentage taxPercentage sizeType ratingsAverage images sku slug status stock salesCount category brand tags colors hasInstallation hasDelivery"
      )
      .populate("category", "ar.name ar.slug en.name en.slug image")
      .populate("brand", "ar.name ar.slug en.name en.slug logo")
      .populate("tags", "name slug type icon")

    console.log("Products result:", products.length);

    if (!products.length) {
      throw NotFound("Products not found");
    }

    return {
      OK: true,
      message: "Products fetched successfully",
      data: products.map(buildGetAllproductDTO),
    };

  } catch (err) {
    console.log("=== ERROR in getProductsByCategory() ===");
    console.log(err);

    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get products", err);
  }
};

export const getProductsByTagService = async (tagSlug, query) => {
  try {
    // Look up tag by slug
    const tag = await Tag.findOne({ slug: tagSlug, status: "active" });
    if (!tag) throw BadRequest(`Tag "${tagSlug}" not found`);

    let mongooseQuery = Product.find({ tags: tag._id })
      .populate("category", "en.name ar.name en.slug ar.slug image")
      .populate("brand", "en.name ar.name en.slug ar.slug logo")
      .populate("tags", "name slug type icon");

    const features = new ApiFeatures(mongooseQuery, query, {
      allowedFilterFields: ["category", "brand", "status"],
      searchFields: ["en.title", "ar.title", "sku"],
    })
      .filter()
      .search()
      .sort()
      .limitFields()
      .paginate();

    const items = await features.mongooseQuery;
    const total = await Product.countDocuments({
      ...features.getFilter(),
      tags: tag._id,
    });

    return {
      OK: true,
      message: `Products with tag '${tagSlug}' fetched successfully`,
      data: items.map(buildProductDTO),
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get products by tag", err);
  }
};

export const getProductsByTagsService = async (tagSlugs, query) => {
  try {
    const slugArray = Array.isArray(tagSlugs) ? tagSlugs : tagSlugs.split(",").map((s) => s.trim());

    // Look up all tags by slug
    const tags = await Tag.find({ slug: { $in: slugArray }, status: "active" });
    if (!tags.length) throw BadRequest("No valid tags found");

    const tagIds = tags.map((t) => t._id);

    let mongooseQuery = Product.find({ tags: { $all: tagIds } })
      .populate("category", "en.name ar.name en.slug ar.slug image")
      .populate("brand", "en.name ar.name en.slug ar.slug logo")
      .populate("tags", "name slug type icon");

    const features = new ApiFeatures(mongooseQuery, query, {
      allowedFilterFields: ["category", "brand", "status"],
      searchFields: ["en.title", "ar.title", "sku"],
    })
      .filter()
      .search()
      .sort()
      .limitFields()
      .paginate();

    const items = await features.mongooseQuery;
    const total = await Product.countDocuments({
      ...features.getFilter(),
      tags: { $all: tagIds },
    });

    return {
      OK: true,
      message: "Products with tags fetched successfully",
      data: items.map(buildProductDTO),
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get products by tags", err);
  }
};

export const getAvailableTagsService = async () => {
  try {
    const tags = await Tag.find({ status: "active" }).lean();

    const tagData = await Promise.all(
      tags.map(async (tag) => {
        const count = await Product.countDocuments({ tags: tag._id });
        return {
          id: tag._id,
          name: tag.name,
          slug: tag.slug,
          type: tag.type,
          icon: tag.icon ? toAbsoluteUrl(tag.icon) : null,
          automationKey: tag.automationKey || null,
          count,
        };
      })
    );

    return {
      OK: true,
      message: "Available tags fetched successfully",
      data: tagData,
    };
  } catch (err) {
    throw ServerError("Failed to get available tags", err);
  }
};

export const bulkUpdateProductTagsService = async (
  productIds,
  tagsToAdd,
  tagsToRemove
) => {
  try {
    // Validate tag ObjectIds
    if (tagsToAdd) {
      const invalidAdd = tagsToAdd.filter((t) => !mongoose.isValidObjectId(t));
      if (invalidAdd.length) throw BadRequest(`Invalid tag IDs to add: ${invalidAdd.join(", ")}`);
    }
    if (tagsToRemove) {
      const invalidRemove = tagsToRemove.filter((t) => !mongoose.isValidObjectId(t));
      if (invalidRemove.length) throw BadRequest(`Invalid tag IDs to remove: ${invalidRemove.join(", ")}`);
    }

    const updateOps = {};
    if (tagsToAdd && tagsToAdd.length > 0) {
      updateOps.$addToSet = { tags: { $each: tagsToAdd } };
    }
    if (tagsToRemove && tagsToRemove.length > 0) {
      updateOps.$pull = { tags: { $in: tagsToRemove } };
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      updateOps
    );

    return {
      OK: true,
      message: "Product tags updated successfully",
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to bulk update product tags", err);
  }
};

/* ============================================================
   BULK IMPORT PRODUCTS (Excel / CSV)
============================================================ */

/**
 * Parse uploaded spreadsheet file into rows
 */
const parseSpreadsheet = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw BadRequest("Spreadsheet has no sheets");

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
  });

  if (!rows.length) throw BadRequest("Spreadsheet is empty");
  return rows;
};

/* ---------- Parsing helpers ---------- */

/** Comma-separated string → array of trimmed strings */
const parseCSV = (val) =>
  String(val || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Pipe-separated string → array of trimmed strings (for values that contain commas) */
const parsePipe = (val) =>
  String(val || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

/** Parse JSON string or return null */
const tryParseJSON = (val) => {
  const str = String(val || "").trim();
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
};

/**
 * Parse specifications:
 *   - JSON array  → [{ key, value, unit, group }]
 *   - Pipe format → "key:value:unit:group | key:value:unit:group"
 */
const parseSpecs = (val) => {
  const str = String(val || "").trim();
  if (!str) return [];
  const json = tryParseJSON(str);
  if (Array.isArray(json)) return json;
  return parsePipe(str).map((entry) => {
    const [key, value, unit, group] = entry.split(":").map((s) => s.trim());
    return { key, value: value || "", unit: unit || "", group: group || "" };
  });
};

/**
 * Parse description:
 *   - JSON array  → [{ title, content }]
 *   - Pipe format → "title:content | title:content"
 */
const parseDescription = (val) => {
  const str = String(val || "").trim();
  if (!str) return [];
  const json = tryParseJSON(str);
  if (Array.isArray(json)) return json;
  return parsePipe(str).map((entry) => {
    const idx = entry.indexOf(":");
    if (idx === -1) return { title: entry, content: "" };
    return { title: entry.slice(0, idx).trim(), content: entry.slice(idx + 1).trim() };
  });
};

/**
 * Parse details:
 *   - JSON array  → [{ key, value }]
 *   - Pipe format → "key:value | key:value"
 */
const parseDetails = (val) => {
  const str = String(val || "").trim();
  if (!str) return [];
  const json = tryParseJSON(str);
  if (Array.isArray(json)) return json;
  return parsePipe(str).map((entry) => {
    const idx = entry.indexOf(":");
    if (idx === -1) return { key: entry, value: "" };
    return { key: entry.slice(0, idx).trim(), value: entry.slice(idx + 1).trim() };
  });
};

/** Parse SEO object from JSON string */
const parseSEO = (val) => {
  const json = tryParseJSON(val);
  if (json && typeof json === "object") return json;
  return undefined;
};

/**
 * Parse tags: accepts comma-separated ObjectIds or slugs.
 * Returns array of strings (will be resolved to ObjectIds during import).
 */
const parseTags = (val) => parseCSV(val).filter(Boolean);

/**
 * Map a single spreadsheet row to product data.
 *
 * Supports columns for the full product schema including
 * descriptions, specifications (key:value:unit:group),
 * details, SEO, images, modelNumber, currencyCode, etc.
 */
const mapRowToProduct = (row, index, categoryMap, brandMap) => {
  const errors = [];
  const rowNum = index + 2; // header is row 1

  // ── Required fields ──
  const sku = String(row.sku || "").trim().toUpperCase();
  if (!sku) errors.push(`Row ${rowNum}: sku is required`);

  const price = parseFloat(row.price);
  if (isNaN(price) || price < 0) errors.push(`Row ${rowNum}: invalid price`);

  const stock = parseInt(row.stock);
  if (isNaN(stock) || stock < 0) errors.push(`Row ${rowNum}: invalid stock`);

  // Category lookup (by name or ID)
  const categoryInput = String(row.category || "").trim();
  let categoryId = null;
  if (!categoryInput) {
    errors.push(`Row ${rowNum}: category is required`);
  } else if (mongoose.isValidObjectId(categoryInput)) {
    categoryId = categoryInput;
  } else {
    categoryId = categoryMap[categoryInput.toLowerCase()];
    if (!categoryId) errors.push(`Row ${rowNum}: category "${categoryInput}" not found`);
  }

  // Brand lookup (by name or ID)
  const brandInput = String(row.brand || "").trim();
  let brandId = null;
  if (!brandInput) {
    errors.push(`Row ${rowNum}: brand is required`);
  } else if (mongoose.isValidObjectId(brandInput)) {
    brandId = brandInput;
  } else {
    brandId = brandMap[brandInput.toLowerCase()];
    if (!brandId) errors.push(`Row ${rowNum}: brand "${brandInput}" not found`);
  }

  // At least one title required
  const arTitle = String(row.ar_title || "").trim();
  const enTitle = String(row.en_title || "").trim();
  if (!arTitle && !enTitle) errors.push(`Row ${rowNum}: ar_title or en_title is required`);

  if (errors.length) return { errors };

  // ── Build product data ──
  const data = {
    sku,
    price,
    stock,
    category: categoryId,
    brand: brandId,
    sizeType: row.sizeType || "large",
    status: row.status || "active",
    tags: parseTags(row.tags),

    // Bilingual content
    ar: {
      title: arTitle,
      subTitle: String(row.ar_subTitle || "").trim(),
      description: parseDescription(row.ar_description),
      specifications: parseSpecs(row.ar_specifications),
      features: parsePipe(row.ar_features),
      warranty: String(row.ar_warranty || "").trim(),
      details: parseDetails(row.ar_details),
    },
    en: {
      title: enTitle,
      subTitle: String(row.en_subTitle || "").trim(),
      description: parseDescription(row.en_description),
      specifications: parseSpecs(row.en_specifications),
      features: parsePipe(row.en_features),
      warranty: String(row.en_warranty || "").trim(),
      details: parseDetails(row.en_details),
    },
  };

  // Optional fields
  if (row.modelNumber) data.modelNumber = String(row.modelNumber).trim();
  if (row.currencyCode) data.currencyCode = String(row.currencyCode).trim().toUpperCase();

  if (row.discountPrice !== undefined && row.discountPrice !== "") {
    data.discountPrice = parseFloat(row.discountPrice) || 0;
  }
  if (row.discountPercentage !== undefined && row.discountPercentage !== "") {
    data.discountPercentage = parseFloat(row.discountPercentage) || 0;
  }

  // Images (pipe-separated URLs)
  const imageUrls = parsePipe(row.images);
  if (imageUrls.length) {
    data.images = imageUrls.map((url) => ({ url }));
  }

  // SEO (JSON string)
  const arSeo = parseSEO(row.ar_seo);
  const enSeo = parseSEO(row.en_seo);
  if (arSeo) data.ar.seo = arSeo;
  if (enSeo) data.en.seo = enSeo;

  return { data };
};

export const bulkImportProductsService = async (filePath) => {
  try {
    const rows = parseSpreadsheet(filePath);

    // Pre-load all categories and brands for name lookup
    const [categories, brands] = await Promise.all([
      Category.find({}).lean(),
      Brand.find({}).lean(),
    ]);

    const categoryMap = {};
    for (const cat of categories) {
      categoryMap[String(cat._id)] = String(cat._id);
      if (cat.en?.name) categoryMap[cat.en.name.toLowerCase()] = String(cat._id);
      if (cat.ar?.name) categoryMap[cat.ar.name.toLowerCase()] = String(cat._id);
    }

    const brandMap = {};
    for (const b of brands) {
      brandMap[String(b._id)] = String(b._id);
      if (b.en?.name) brandMap[b.en.name.toLowerCase()] = String(b._id);
      if (b.ar?.name) brandMap[b.ar.name.toLowerCase()] = String(b._id);
    }

    // Pre-load tags for slug lookup
    const allTags = await Tag.find({}).lean();
    const tagSlugMap = {};
    for (const t of allTags) {
      tagSlugMap[t.slug] = String(t._id);
      if (t.automationKey) tagSlugMap[t.automationKey] = String(t._id);
      tagSlugMap[String(t._id)] = String(t._id);
    }

    // Check existing SKUs in one query
    const allSkus = rows
      .map((r) => String(r.sku || "").trim().toUpperCase())
      .filter(Boolean);
    const existingProducts = await Product.find({ sku: { $in: allSkus } })
      .select("sku")
      .lean();
    const existingSkuSet = new Set(existingProducts.map((p) => p.sku));

    const results = {
      totalRows: rows.length,
      created: 0,
      skipped: 0,
      errors: [],
    };

    const productsToInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const { data, errors } = mapRowToProduct(rows[i], i, categoryMap, brandMap);

      if (errors) {
        results.errors.push(...errors);
        results.skipped++;
        continue;
      }

      if (existingSkuSet.has(data.sku)) {
        results.errors.push(`Row ${i + 2}: SKU "${data.sku}" already exists – skipped`);
        results.skipped++;
        continue;
      }

      // Resolve tag slugs/keys to ObjectIds
      if (data.tags && data.tags.length) {
        data.tags = data.tags
          .map((t) => tagSlugMap[t] || tagSlugMap[t.toLowerCase()])
          .filter(Boolean);
      }

      applySlugIfMissing(data);
      applyPricingLogic(data);
      productsToInsert.push(data);
      existingSkuSet.add(data.sku); // prevent duplicates within the file
    }

    // Bulk insert
    if (productsToInsert.length > 0) {
      const inserted = await Product.insertMany(productsToInsert, {
        ordered: false,
      });
      results.created = inserted.length;
      await RedisHelper.del(HOME_CACHE_KEY);

      // Queue embedding generation for all imported products
      const insertedIds = inserted.map((p) => p._id);
      queueProductsForEmbedding(insertedIds).catch((err) =>
        console.error("[Embedding] Queue error on bulk import:", err.message)
      );
    }

    return {
      OK: true,
      message: `Bulk import completed: ${results.created} created, ${results.skipped} skipped`,
      data: results,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to bulk import products", {
      message: err.message,
    });
  }
};

/* ============================================================
   BULK UPDATE PRODUCTS BY SKU (Excel / CSV)
============================================================ */
export const bulkUpdateProductsService = async (filePath) => {
  try {
    const rows = parseSpreadsheet(filePath);

    const [categories, brands] = await Promise.all([
      Category.find({}).lean(),
      Brand.find({}).lean(),
    ]);

    const categoryMap = {};
    for (const cat of categories) {
      categoryMap[String(cat._id)] = String(cat._id);
      if (cat.en?.name) categoryMap[cat.en.name.toLowerCase()] = String(cat._id);
      if (cat.ar?.name) categoryMap[cat.ar.name.toLowerCase()] = String(cat._id);
    }

    const brandMap = {};
    for (const b of brands) {
      brandMap[String(b._id)] = String(b._id);
      if (b.en?.name) brandMap[b.en.name.toLowerCase()] = String(b._id);
      if (b.ar?.name) brandMap[b.ar.name.toLowerCase()] = String(b._id);
    }

    // Collect all SKUs from the file
    const allSkus = rows
      .map((r) => String(r.sku || "").trim().toUpperCase())
      .filter(Boolean);

    // Load existing products by SKU
    const existingProducts = await Product.find({ sku: { $in: allSkus } }).lean();
    const existingSkuMap = new Map(existingProducts.map((p) => [p.sku, p]));

    const results = {
      totalRows: rows.length,
      updated: 0,
      skipped: 0,
      notFound: 0,
      errors: [],
    };
    const updatedIds = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const sku = String(row.sku || "").trim().toUpperCase();

      if (!sku) {
        results.errors.push(`Row ${rowNum}: sku is required`);
        results.skipped++;
        continue;
      }

      const existing = existingSkuMap.get(sku);
      if (!existing) {
        results.errors.push(`Row ${rowNum}: SKU "${sku}" not found – skipped`);
        results.notFound++;
        continue;
      }

      // Build partial update from non-empty fields
      const updateData = buildPartialUpdate(row, categoryMap, brandMap, rowNum);

      if (updateData.errors.length) {
        results.errors.push(...updateData.errors);
        results.skipped++;
        continue;
      }

      if (Object.keys(updateData.data).length === 0) {
        results.errors.push(`Row ${rowNum}: no fields to update`);
        results.skipped++;
        continue;
      }

      // Apply pricing logic if price-related fields changed
      if (updateData.data.price || updateData.data.discountPrice != null || updateData.data.discountPercentage != null) {
        const priceData = {
          price: updateData.data.price || existing.price,
          discountPrice: updateData.data.discountPrice ?? existing.discountPrice,
          discountPercentage: updateData.data.discountPercentage ?? existing.discountPercentage,
        };
        applyPricingLogic(priceData);
        Object.assign(updateData.data, priceData);
      }

      try {
        await Product.findByIdAndUpdate(existing._id, { $set: updateData.data });
        results.updated++;
        updatedIds.push(existing._id);
      } catch (err) {
        results.errors.push(`Row ${rowNum}: update failed – ${err.message}`);
        results.skipped++;
      }
    }

    if (results.updated > 0) {
      await RedisHelper.del(HOME_CACHE_KEY);

      // Queue embedding re-generation for all updated products
      queueProductsForEmbedding(updatedIds).catch((err) =>
        console.error("[Embedding] Queue error on bulk update:", err.message)
      );
    }

    return {
      OK: true,
      message: `Bulk update completed: ${results.updated} updated, ${results.skipped} skipped, ${results.notFound} not found`,
      data: results,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to bulk update products", {
      message: err.message,
    });
  }
};

/**
 * Build a partial update object from a spreadsheet row.
 * Only includes fields that have non-empty values.
 */
const buildPartialUpdate = (row, categoryMap, brandMap, rowNum) => {
  const errors = [];
  const data = {};

  // Price
  if (row.price !== undefined && row.price !== "") {
    const price = parseFloat(row.price);
    if (isNaN(price) || price < 0) errors.push(`Row ${rowNum}: invalid price`);
    else data.price = price;
  }

  // Stock
  if (row.stock !== undefined && row.stock !== "") {
    const stock = parseInt(row.stock);
    if (isNaN(stock) || stock < 0) errors.push(`Row ${rowNum}: invalid stock`);
    else data.stock = stock;
  }

  // Category
  const categoryInput = String(row.category || "").trim();
  if (categoryInput) {
    if (mongoose.isValidObjectId(categoryInput)) {
      data.category = categoryInput;
    } else {
      const catId = categoryMap[categoryInput.toLowerCase()];
      if (!catId) errors.push(`Row ${rowNum}: category "${categoryInput}" not found`);
      else data.category = catId;
    }
  }

  // Brand
  const brandInput = String(row.brand || "").trim();
  if (brandInput) {
    if (mongoose.isValidObjectId(brandInput)) {
      data.brand = brandInput;
    } else {
      const bId = brandMap[brandInput.toLowerCase()];
      if (!bId) errors.push(`Row ${rowNum}: brand "${brandInput}" not found`);
      else data.brand = bId;
    }
  }

  // Simple optional fields
  if (row.status && ["active", "inactive", "draft"].includes(row.status)) data.status = row.status;
  if (row.sizeType) data.sizeType = row.sizeType;
  if (row.modelNumber) data.modelNumber = String(row.modelNumber).trim();
  if (row.currencyCode) data.currencyCode = String(row.currencyCode).trim().toUpperCase();

  // Discount
  if (row.discountPrice !== undefined && row.discountPrice !== "") {
    data.discountPrice = parseFloat(row.discountPrice) || 0;
  }
  if (row.discountPercentage !== undefined && row.discountPercentage !== "") {
    data.discountPercentage = parseFloat(row.discountPercentage) || 0;
  }

  // Tags
  const tagsStr = String(row.tags || "").trim();
  if (tagsStr) data.tags = parseTags(tagsStr);

  // Images
  const imageUrls = parsePipe(String(row.images || ""));
  if (imageUrls.length) data.images = imageUrls.map((url) => ({ url }));

  // Arabic content
  const arTitle = String(row.ar_title || "").trim();
  if (arTitle) data["ar.title"] = arTitle;
  const arSubTitle = String(row.ar_subTitle || "").trim();
  if (arSubTitle) data["ar.subTitle"] = arSubTitle;
  if (String(row.ar_description || "").trim()) data["ar.description"] = parseDescription(row.ar_description);
  if (String(row.ar_specifications || "").trim()) data["ar.specifications"] = parseSpecs(row.ar_specifications);
  if (String(row.ar_features || "").trim()) data["ar.features"] = parsePipe(row.ar_features);
  const arWarranty = String(row.ar_warranty || "").trim();
  if (arWarranty) data["ar.warranty"] = arWarranty;
  if (String(row.ar_details || "").trim()) data["ar.details"] = parseDetails(row.ar_details);

  // English content
  const enTitle = String(row.en_title || "").trim();
  if (enTitle) data["en.title"] = enTitle;
  const enSubTitle = String(row.en_subTitle || "").trim();
  if (enSubTitle) data["en.subTitle"] = enSubTitle;
  if (String(row.en_description || "").trim()) data["en.description"] = parseDescription(row.en_description);
  if (String(row.en_specifications || "").trim()) data["en.specifications"] = parseSpecs(row.en_specifications);
  if (String(row.en_features || "").trim()) data["en.features"] = parsePipe(row.en_features);
  const enWarranty = String(row.en_warranty || "").trim();
  if (enWarranty) data["en.warranty"] = enWarranty;
  if (String(row.en_details || "").trim()) data["en.details"] = parseDetails(row.en_details);

  // SEO
  const arSeo = parseSEO(row.ar_seo);
  const enSeo = parseSEO(row.en_seo);
  if (arSeo) data["ar.seo"] = arSeo;
  if (enSeo) data["en.seo"] = enSeo;

  return { data, errors };
};
