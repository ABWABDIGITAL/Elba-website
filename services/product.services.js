import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import mongoose from "mongoose";
import ApiError, {
  BadRequest,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";
import slugify from "slugify";
import { trackProductView } from '../services/analytics.services.js';
export const buildCompareDTO = (p) => {
  if (!p) return null;
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
    images: p.images || [],
    sku: p.sku,
    slug: p.slug,
    price: p.price,
    finalPrice: p.finalPrice,
    stock: p.stock,
    brand: p.brand,
    ratingsAverage: p.ratingsAverage,
    ratingsQuantity: p.ratingsQuantity,
  };
};

export const buildGetAllproductDTO = (p) => {
  if (!p) return null;
  return {
    id: p._id,
    ar: {
      title: p.ar?.title,
    },
    en: {
      title: p.en?.title,
    },
    images: p.images || [],
    sku: p.sku,
    slug: p.slug,
    price: p.price,
    discountPrice: p.discountPrice,
    discountPercentage: p.discountPercentage,
    finalPrice: p.finalPrice,
    ratingsAverage:p.ratingsAverage,
    sizeType: p.sizeType || null,
    brand:p.brand,
    category:p.category,
    stock:p.stock,
    status:p.status,
    salesCount:p.salesCount,
  };
};

export const buildProductDTO = (p) => {
  if (!p) return null;
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
      catalog:p.ar?.catalog,
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
      catalog:p.en?.catalog,
      seo: p.en?.seo,
    },
    images: p.images || [],
    sku: p.sku,
    slug: p.slug,
    price: p.price,
    discountPrice: p.discountPrice,
    discountPercentage: p.discountPercentage,
    finalPrice: p.finalPrice,
    stock: p.stock,
    status: p.status,
    category: p.category,
    brand: p.brand,
    ratingsAverage: p.ratingsAverage,
    ratingsQuantity: p.ratingsQuantity,
    installments:p.installments,
    views: p.views,
    sizeType:p.sizeType,
    salesCount: p.salesCount,
    isFav:p.isFav,
    tags: p.tags || [],
  };
};
export const buildGetCatalogProductDTO = (p) => {
  if (!p) return null;
  return {
    id: p._id,
    ar: {
      title: p.ar?.title,
      subTitle: p.ar?.subTitle,
      catalog:p.ar?.catalog,
    },
    en: {
      title: p.en?.title,
      subTitle: p.en?.subTitle,
      catalog:p.en?.catalog,
    },
    images: p.images || [],
    sku: p.sku,
    slug: p.slug,
    ratingsAverage:p.ratingsAverage,
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

  // لو فيه discountPrice (قيمة الخصم)
  if (data.discountPrice != null) {
    if (data.discountPrice < 0) data.discountPrice = 0;
    if (data.discountPrice > price) data.discountPrice = price;

    data.finalPrice = Number((price - data.discountPrice).toFixed(2));
    data.discountPercentage = Number(
      ((data.discountPrice / price) * 100).toFixed(2)
    );
    return;
  }

  // لو فيه discountPercentage
  if (data.discountPercentage != null) {
    if (data.discountPercentage < 0) data.discountPercentage = 0;
    if (data.discountPercentage > 100) data.discountPercentage = 100;

    data.discountPrice = Number(
      ((price * data.discountPercentage) / 100).toFixed(2)
    );
    data.finalPrice = Number((price - data.discountPrice).toFixed(2));
    return;
  }

  // لا يوجد خصم
  data.discountPrice = 0;
  data.discountPercentage = 0;
  data.finalPrice = price;
}

export const createProductService = async (data) => {
  try {
    const exists = await Product.findOne({ sku: data.sku });
    if (exists) throw BadRequest("SKU already exists");

    applySlugIfMissing(data);
    applyPricingLogic(data);

    const product = new Product(data);
    validateProductDomain(product);

    await product.save();
    console.log(product)
    return {
      OK: true,
      message: "Product created successfully",
      data: buildProductDTO(product),
    };
  } catch (err) {
     console.error("CREATE PRODUCT ERROR 👉", err);

  if (err instanceof ApiError) throw err;

  throw ServerError("Failed to create product", {
    message: err.message,
    name: err.name,
    stack: err.stack,
  });
  }
};

export const updateProductService = async (slug, data) => {
  try {
    const product = await Product.findOne({ slug });
    if (!product) throw NotFound("Product not found");

    // SAFE UPDATE
    for (const key in data) {
      if (data[key] !== undefined) {
        product.set(key, data[key]);
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

    const updated = await product.save();

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
    const limit = Number(query.limit) ;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.brand) filter.brand = query.brand;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select("en.title en.subTitle ar.title ar.subTitle price finalPrice sizeType ratingsAverage images sku slug status stock salesCount")
        .populate("category", "ar.name ar.slug en.name en.slug image")
        .populate("brand", "ar.name ar.slug en.name en.slug logo")

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
export const getAllProductsForAdminService = async (query) => {
  try {
    const page = Number(query.page) ;
    const limit = Number(query.limit);
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.brand) filter.brand = query.brand;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select("en.title en.subTitle ar.title ar.subTitle price finalPrice sizeType ratingsAverage images sku slug status stock salesCount")
        .populate("category", "ar.name ar.slug en.name en.slug image")
        .populate("brand", "ar.name ar.slug en.name en.slug logo")

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
    
export const getProductByslugService = async (req , slug) => {
  const product = await Product.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate("category", "ar.name ar.slug en.name en.slug image")
    .populate("brand", "ar.name ar.slug en.name en.slug logo");

  if (!product) throw NotFound("Product not found");

  const similarProducts = await Product.find({
    category: product.category?._id || null,
    _id: { $ne: product._id },
    status: "active"
  })
    .populate("category", "ar.name ar.slug en.name en.slug image")
    .populate("brand", "ar.name ar.slug en.name en.slug logo")
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
      "name",
      "slug",
      "description",
      "category.name",
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
      category: category._id 
    })
    .select("en.title ar.title sku images ratingsAverage finalPrice discountPercentage sizeType")
    .populate("category", "ar.name ar.slug en.name en.slug image")
    .populate("brand", "ar.name ar.slug en.name en.slug logo")

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

export const getProductsByTagService = async (tag, query) => {
  try {
    const validTags = [
      "best_seller",
      "hot",
      "new_arrival",
      "trending",
      "featured",
      "limited_edition",
      "on_sale",
      "clearance",
      "top_rated",
      "eco_friendly",
      "exclusive",
      "recommended",
    ];

    if (!validTags.includes(tag)) {
      throw BadRequest(`Invalid tag. Valid tags: ${validTags.join(", ")}`);
    }

    let mongooseQuery = Product.find({ tags: tag })
      .populate("category", "en.name ar.name en.slug ar.slug")
      .populate("brand", "en.name ar.name en.slug ar.slug");

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
      tags: tag,
    });

    return {
      OK: true,
      message: `Products with tag '${tag}' fetched successfully`,
      data: items.map(buildProductDTO),
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get products by tag", err);
  }
};

export const getProductsByTagsService = async (tags, query) => {
  try {
    const validTags = [
      "best_seller",
      "hot",
      "new_arrival",
      "trending",
      "featured",
      "limited_edition",
      "on_sale",
      "clearance",
      "top_rated",
      "eco_friendly",
      "exclusive",
      "recommended",
    ];

    const tagArray = Array.isArray(tags) ? tags : tags.split(",");

    const invalidTags = tagArray.filter((t) => !validTags.includes(t));
    if (invalidTags.length > 0) {
      throw BadRequest(
        `Invalid tags: ${invalidTags.join(
          ", "
        )}. Valid tags: ${validTags.join(", ")}`
      );
    }

    let mongooseQuery = Product.find({ tags: { $all: tagArray } })
      .populate("category", "en.name ar.name en.slug ar.slug")
      .populate("brand", "en.name ar.name en.slug ar.slug");

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
      tags: { $all: tagArray },
    });

    return {
      OK: true,
      message: `Products with tags fetched successfully`,
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
    const tagStats = await Product.aggregate([
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const allTags = [
      "best_seller",
      "hot",
      "new_arrival",
      "trending",
      "featured",
      "limited_edition",
      "on_sale",
      "clearance",
      "top_rated",
      "eco_friendly",
      "exclusive",
      "recommended",
    ];

    const tagData = allTags.map((tag) => {
      const stat = tagStats.find((s) => s._id === tag);
      return {
        tag,
        count: stat ? stat.count : 0,
        displayName: {
          en: tag.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          ar: getArabicTagName(tag),
        },
      };
    });

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
    const validTags = [
      "best_seller",
      "hot",
      "new_arrival",
      "trending",
      "featured",
      "limited_edition",
      "on_sale",
      "clearance",
      "top_rated",
      "eco_friendly",
      "exclusive",
      "recommended",
    ];

    if (tagsToAdd) {
      const invalidAdd = tagsToAdd.filter((t) => !validTags.includes(t));
      if (invalidAdd.length > 0) {
        throw BadRequest(`Invalid tags to add: ${invalidAdd.join(", ")}`);
      }
    }

    if (tagsToRemove) {
      const invalidRemove = tagsToRemove.filter((t) => !validTags.includes(t));
      if (invalidRemove.length > 0) {
        throw BadRequest(
          `Invalid tags to remove: ${invalidRemove.join(", ")}`
        );
      }
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

function getArabicTagName(tag) {
  const arabicNames = {
    best_seller: "الأكثر مبيعاً",
    hot: "ساخن",
    new_arrival: "وصل حديثاً",
    trending: "رائج",
    featured: "مميز",
    limited_edition: "إصدار محدود",
    on_sale: "تخفيضات",
    clearance: "تصفية",
    top_rated: "الأعلى تقييماً",
    eco_friendly: "صديق للبيئة",
    exclusive: "حصري",
    recommended: "موصى به",
  };
  return arabicNames[tag] || tag;
}
