// services/product.services.js
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import mongoose from "mongoose";
import slugify from "slugify";
import ApiError, {
  BadRequest,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";

/* --------------------------------------------------
   DTO BUILDERS (aligned with new model)
--------------------------------------------------- */
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
    sizeType:p.sizeTye,
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

/* --------------------------------------------------
   VALIDATION
--------------------------------------------------- */
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

/* --------------------------------------------------
   SLUG LOGIC HELPER (kept for compatibility)
   - لا نستخدمه للـ ar/en الآن، فقط يمكن استخدامه لو احتجت لاحقاً
--------------------------------------------------- */
const applySlugIfMissing = (data) => {
  // slug root from SKU لو حابب تبنيه من البيانات قبل الـ save
  if (!data.slug && data.sku) {
    data.slug = slugify(String(data.sku), { lower: true, strict: true });
  }
};

/* --------------------------------------------------
   PRICING LOGIC
   discountPrice = discount VALUE
--------------------------------------------------- */
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

/* --------------------------------------------------
   CREATE PRODUCT
--------------------------------------------------- */
export const createProductService = async (data) => {
  try {
    const exists = await Product.findOne({ sku: data.sku });
    if (exists) throw BadRequest("SKU already exists");

    applySlugIfMissing(data);
    applyPricingLogic(data);

    const product = new Product(data);
    validateProductDomain(product);

    await product.save();

    return {
      OK: true,
      message: "Product created successfully",
      data: buildProductDTO(product),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to create product", err);
  }
};

/* --------------------------------------------------
   UPDATE PRODUCT
--------------------------------------------------- */
export const updateProductService = async (id, data) => {
  try {
    applySlugIfMissing(data);

    if (
      data.price != null ||
      data.discountPrice != null ||
      data.discountPercentage != null
    ) {
      applyPricingLogic(data);
    }

    const updated = await Product.findOneAndUpdate(
      { _id: id },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!updated) throw NotFound("Product not found");

    validateProductDomain(updated);

    return {
      OK: true,
      message: "Product updated successfully",
      data: buildProductDTO(updated),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to update product", err);
  }
};

/* --------------------------------------------------
   HARD DELETE PRODUCT
--------------------------------------------------- */
export const deleteProductService = async (id) => {
  try {
    const deleted = await Product.findOneAndDelete({ _id: id });

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

/* --------------------------------------------------
   GET ALL PRODUCTS
--------------------------------------------------- */
export const getAllProductsService = async (query) => {
  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.brand) filter.brand = query.brand;

    const [items, total] = await Promise.all([
      Product.find(filter)
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
    
export const getProductBySkuService = async (sku) => {
  const product = await Product.findOneAndUpdate(
    { sku },
    { $inc: { views: 1 } },
    { new: true }
  )
  .populate("category", "ar.name ar.slug en.name en.slug image")
  .populate("brand", "ar.name ar.slug en.name en.slug logo");

  if (!product) throw NotFound("Product not found");

  // Get similar products (same category, different product)
  const similarProducts = await Product.find({
    category: product.category._id,
    _id: { $ne: product._id },
    status: "active"
  })
  .populate("category", "ar.name ar.slug en.name en.slug image")
  .populate("brand", "ar.name ar.slug en.name en.slug logo")
  .limit(10)
  .sort({ ratingsAverage: -1, salesCount: -1 });

  return {
    OK: true,
    message: "Product fetched successfully",
    data: buildProductDTO(product),
    similarProducts: similarProducts.map(buildGetAllproductDTO),
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

/* --------------------------------------------------
   HELPER: GET CATEGORY + ALL DESCENDANTS
   (يفترض وجود field: parent في Category)
--------------------------------------------------- */
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

/* --------------------------------------------------
   BEST SELLING BY CATEGORY (FULL TREE)
--------------------------------------------------- */
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

/* --------------------------------------------------
   BEST OFFERS
--------------------------------------------------- */
export const getBestOffersService = async (query) => {
  try {
    const { top } = query;

    let mongooseQuery = Product.find({})
      .populate("category", "ar.name ar.slug en.name en.slug image")
.populate("brand", "ar.name ar.slug en.name en.slug logo")


    if (top) {
      const items = await mongooseQuery
        .sort("-discountPercentage -discountPrice")
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

    features.mongooseQuery = features.mongooseQuery.sort(
      "-discountPercentage -discountPrice"
    );

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

/* --------------------------------------------------
   PRODUCTS BY CATALOG
--------------------------------------------------- */
export const getProductsByCategory = async (categoryId) => {
  try {

    console.log("=== getProductsByCategory() START ===");
    console.log("Incoming categoryId:", categoryId);

    // 1) Validate categoryId
    if (!categoryId) {
      console.log("ERROR: categoryId is missing!");
      throw BadRequest("categoryId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.log("ERROR: invalid ObjectId:", categoryId);
      throw BadRequest("Invalid categoryId");
    }

    // 2) Get category
    console.log("Finding category by ID...");
    const category = await Category.findById(categoryId).lean();
    console.log("Category result:", category);

    if (!category) {
      console.log("ERROR: Category not found");
      throw NotFound("Category not found");
    }

    // 3) Find products
    console.log("Finding products for category:", categoryId);
    const products = await Product.find({ category: categoryId })
      .populate("category", "ar.name ar.slug en.name en.slug image")
      .populate("brand", "ar.name ar.slug en.name en.slug logo")
      .lean();

    console.log("Products result:", products.length);

    if (!products.length) {
      console.log("ERROR: Products not found");
      throw NotFound("Products not found");
    }

    console.log("=== getProductsByCategory() SUCCESS ===");

    return {
      OK: true,
      message: "Products fetched successfully",
      data: products.map(buildProductDTO),
    };

  } catch (err) {
    console.log("=== ERROR in getProductsByCategory() ===");
    console.log(err);

    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get products", err);
  }
};



/* --------------------------------------------------
   GET PRODUCTS BY TAG
--------------------------------------------------- */
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

/* --------------------------------------------------
   GET PRODUCTS BY MULTIPLE TAGS
--------------------------------------------------- */
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

/* --------------------------------------------------
   GET ALL AVAILABLE TAGS WITH COUNTS
--------------------------------------------------- */
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

/* --------------------------------------------------
   BULK UPDATE PRODUCT TAGS
--------------------------------------------------- */
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

// Helper function for Arabic tag names
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
