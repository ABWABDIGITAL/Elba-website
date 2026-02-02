import Review from "../models/review.model.js";
import ApiError, {
  BadRequest,
  Forbidden,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";
import Product from "../models/product.model.js";

const prefixUrl = (filePath) => {
  if (!filePath) return filePath;
  if (filePath.startsWith("http")) return filePath;
  const base = process.env.BASE_URL || "";
  return `${base}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
};

/**
 * Create review – one per user per product
 */
export const createReviewService = async ({ product, user, rating, title, comment, name, email }) => {
  // Enforce one review per user per product
  const existing = await Review.findOne({ product, user });
  if (existing) {
    throw BadRequest("You have already reviewed this product");
  }

  try {
    const review = await Review.create({
      product,
      user,
      rating,
      title,
      comment,
      name,
      email
    });

    return review;
  } catch (err) {
    if (err.code === 11000) {
      // unique index fallback
      throw BadRequest("You have already reviewed this product");
    }
    throw ServerError("Failed to create review", err);
  }
};

/**
 * Get single review
 */
export const getReviewService = async (slug) => {
  try {
    // 1. Find the product by slug
    const product = await Product.findOne({ slug }).select("_id name slug");
    if (!product) throw NotFound("Product not found");

    // 2. Find all reviews for that product
    const reviews = await Review.find({ product: product._id })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return {
      product,
      reviews,
    };

  } catch (err) {
    console.error("getReviewService error:", err);
    throw BadRequest("Failed to get reviews");
  }
};
/**
 * Update review – only owner or admin
 */
export const updateReviewService = async ({ id, userId, userRole, rating, title, comment, isActive }) => {
  const review = await Review.findById(id);
  if (!review) throw NotFound("Review not found");

  if (review.user.toString() !== userId.toString() && userRole !== "admin") {
    throw Forbidden("You are not allowed to update this review");
  }

  if (rating !== undefined) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;
  if (isActive !== undefined) review.isActive = isActive;

  try {
    await review.save();
    return review;
  } catch (err) {
    throw ServerError("Failed to update review", err);
  }
};
export const getReviewByIdService = async (id) => {
  const review = await Review.findById(id)
    .populate("user", "name email")
    .populate("product", "ar.title en.title slug images")
    .lean();
  if (!review) throw NotFound("Review not found");

  if (review.product?.images) {
    review.product.images = review.product.images.map(img => ({
      ...img,
      url: prefixUrl(img.url),
    }));
  }

  return review;
};

export const deleteReviewService = async ({ id, userId, userRole }) => {
  const review = await Review.findById(id);
  if (!review) throw NotFound("Review not found");

  // handle missing review.user
  if (!review.user) {
    if (userRole !== "admin" && userRole !== "superAdmin") {
      throw Forbidden("Only admins can delete a review without assigned user");
    }
    return await Review.findByIdAndDelete(id);
  }

  // support populated or unpopulated user field
  const reviewUserId = review.user._id?.toString() || review.user.toString();

  // if (reviewUserId !== userId.toString() && userRole !== "admin" && userRole !== "superAdmin") {
  //   throw Forbidden("You are not allowed to delete this review");
  // }

  return await Review.findByIdAndDelete(id);
};



/**
 * Toggle review active status – admin only
 */
export const toggleReviewActiveService = async ({ id, userRole }) => {
  if (userRole !== "admin" && userRole !== "superAdmin") {
      throw Forbidden("Only admins can toggle review active status");
  }

  const review = await Review.findById(id);
  if (!review) throw NotFound("Review not found");

  review.isActive = !review.isActive;

  try {
    await review.save();
    return review;
  } catch (err) {
    throw ServerError("Failed to toggle review status", err);
  }
};

/**
 * Get all reviews with filter + rating range + pagination
 * rating range: ?rating_gte=3&rating_lte=5
 */
export const getReviewsService = async (query) => {
  try {
    const features = new ApiFeatures(Review.find(), query, {
      allowedFilterFields: ["product", "rating", "isActive"],
      searchFields: ["title", "comment" , "name"],
    });

    // base filter
    features.filter();
    let filter = features.getFilter();

 

    // custom rating range
    if (query.rating_gte) {
      filter.rating = filter.rating || {};
      filter.rating.$gte = Number(query.rating_gte);
    }
    if (query.rating_lte) {
      filter.rating = filter.rating || {};
      filter.rating.$lte = Number(query.rating_lte);
    }

    // rebuild query with updated filter
    features.mongooseQuery = Review.find(filter);

    features.search().sort().limitFields().paginate();

   const data = await features.mongooseQuery
  .populate({
    path: "product",
    select: "ar.title en.title slug images",
    options: { lean: true }
  })
  .lean();

    // Prefix product image URLs
    for (const review of data) {
      if (review.product?.images) {
        review.product.images = review.product.images.map(img => ({
          ...img,
          url: prefixUrl(img.url),
        }));
      }
    }

    const total = await Review.countDocuments(filter);

    return {
      data,
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    throw ServerError("Failed to fetch reviews", err);
  }
};
