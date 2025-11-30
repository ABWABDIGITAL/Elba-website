import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import slugify from "slugify";
import ApiError, {
  BadRequest,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";

/* --------------------------------------------------
   DTO BUILDERS
--------------------------------------------------- */
export const buildCompareDTO = (p) => {
  if (!p) return null;
  return {
    id: p._id,
    name: p.name,
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    price: p.price,
    discountPercentage: p.discountPercentage,
    discountPrice: p.discountPrice,
    finalPrice: p.finalPrice,
    stock: p.stock,
    status: p.status,
    modelNumber: p.modelNumber,
    description: p.description,
    details: p.details,
    seo: p.seo,
    category: p.category,
    brand: p.brand,
    images: p.images,
    ratingsAverage: p.ratingsAverage,
    ratingsQuantity: p.ratingsQuantity,
    views: p.views,
    salesCount: p.salesCount,
    features: p.features,
    specifications: p.specifications,
    warranty: p.warranty,
  };
};

export const buildGetAllproductDTO = (p) => {
  if (!p) return null;
  return {
    id: p._id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    images: p.images,
  };
};

export const buildProductDTO = (p) => {
  if (!p) return null;
  return {
    id: p._id,
    name: p.name,
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    price: p.price,
    discountPercentage: p.discountPercentage,
    discountPrice: p.discountPrice,
    finalPrice: p.finalPrice,
    stock: p.stock,
    status: p.status,
    modelNumber: p.modelNumber,
    description: p.description,
    specifications: p.specifications,
    details: p.details,
    seo: p.seo,
    category: p.category,
    brand: p.brand,
    reference: p.reference,
    images: p.images,
    ratingsAverage: p.ratingsAverage,
    ratingsQuantity: p.ratingsQuantity,
    views: p.views,
    salesCount: p.salesCount,
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

  if (errors.length) throw BadRequest("Product validation failed", errors);
};

/* --------------------------------------------------
   SLUG LOGIC
--------------------------------------------------- */
const applySlugIfMissing = (data) => {
  if (!data.slug && data.name) {
    const slug = {};
    if (data.name.en) slug.en = slugify(data.name.en, { lower: true });
    if (data.name.ar)
      slug.ar = slugify(data.name.ar, {
        lower: true,
        strict: false,
        locale: "ar",
      }).replace(/[^\u0600-\u06FF0-9\-]/g, "");
    data.slug = slug;
  }
};

/* --------------------------------------------------
   PRICING LOGIC (FINAL VERSION)
--------------------------------------------------- */
function applyPricingLogic(data) {
  const price = data.price;

  // لو مفيش price مش هنحسب حاجة
  if (price == null) return;

  // لو فيه discountPrice → finalPrice = price - discountPrice
  if (data.discountPrice != null) {
    data.finalPrice = price - data.discountPrice;
    data.discountPercentage = Number(
      ((data.discountPrice / price) * 100).toFixed(2)
    );
    return;
  }

  // لو فيه discountPercentage → احسب discountPrice + finalPrice
  if (data.discountPercentage != null) {
    data.discountPrice = Number(
      ((price * data.discountPercentage) / 100).toFixed(2)
    );
    data.finalPrice = price - data.discountPrice;
    return;
  }

  // لو مافيش خصم → finalPrice = price
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

    await product.save(); // triggers hooks

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
   UPDATE PRODUCT (Triggers Hooks Correctly)
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
        .populate("category", "name slug")
        .populate("brand", "name slug")
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

/* --------------------------------------------------
   GET PRODUCT BY SKU
--------------------------------------------------- */
export const getProductBySkuService = async (sku) => {
  try {
    const product = await Product.findOneAndUpdate(
      { sku },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("category", "name slug")
      .populate("brand", "name slug");

    if (!product) throw NotFound("Product not found");

    return {
      OK: true,
      message: "Product fetched successfully",
      data: buildProductDTO(product),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get product", err);
  }
};

/* --------------------------------------------------
   COMPARE PRODUCTS
--------------------------------------------------- */
export const getCompareProductsService = async (skus) => {
  try {
    const products = await Product.find({ sku: { $in: skus } })
      .populate("category", "name slug")
      .populate("brand", "name slug");

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
   BEST SELLING BY CATEGORY
--------------------------------------------------- */
export const getBestSellingByCategoryService = async (categoryId, query) => {
  try {
    const { top } = query;

    let mongooseQuery = Product.find({ category: categoryId })
      .populate("category", "name slug")
      .populate("brand", "name slug");

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
      searchFields: ["name.en", "name.ar", "sku"],
    })
      .filter()
      .search()
      .limitFields()
      .paginate();

    features.mongooseQuery = features.mongooseQuery.sort(
      "-salesCount -views -ratingsQuantity"
    );

    const items = await features.mongooseQuery;
    const total = await Product.countDocuments(features.getFilter());

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
      .populate("category", "name slug")
      .populate("brand", "name slug");

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
      searchFields: ["name.en", "name.ar", "sku"],
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
export const getProductsByCatalog = async (catalogId) => {
  try {
    const categories = await Category.find({ catalog: catalogId }).select("_id");

    if (!categories.length) throw NotFound("Categories not found for this catalog");

    const categoryIds = categories.map((c) => c._id);

    const products = await Product.find({ category: { $in: categoryIds } })
      .populate("category", "name slug")
      .populate("brand", "name slug");

    if (!products.length) throw NotFound("Products not found");

    return {
      OK: true,
      message: "Products fetched successfully",
      data: products.map(buildProductDTO),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to get products", err);
  }
};
