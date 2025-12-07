import Review from "../models/review.model.js";
import ApiError, {
  BadRequest,
  Forbidden,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";

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
export const getReviewService = async (id) => {
  try {
    const review = await Review.findById(id).populate("product", "name comment rating");
    if (!review) throw NotFound("Review not found");
    return review;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw BadRequest("Invalid review ID");
  }
};

/**
 * Update review – only owner or admin
 */
export const updateReviewService = async ({ id, userId, userRole, rating, title, comment }) => {
  const review = await Review.findById(id);
  if (!review) throw NotFound("Review not found");

  if (review.user.toString() !== userId.toString() && userRole !== "admin") {
    throw Forbidden("You are not allowed to update this review");
  }

  if (rating !== undefined) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;

  try {
    await review.save();
    return review;
  } catch (err) {
    throw ServerError("Failed to update review", err);
  }
};

/**
 * Delete review – only owner or admin
 */
export const deleteReviewService = async ({ id, userId, userRole }) => {
  const review = await Review.findById(id);
  if (!review) throw NotFound("Review not found");

  if (review.user.toString() !== userId.toString() && userRole !== "admin") {
    throw Forbidden("You are not allowed to delete this review");
  }

  try {
    const deleted = await Review.findOneAndDelete({ _id: id });
    return deleted;
  } catch (err) {
    throw ServerError("Failed to delete review", err);
  }
};

/**
 * Toggle review active status – admin only
 */
export const toggleReviewActiveService = async ({ id, userRole }) => {
  if (userRole !== "admin") {
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

    // default to showing only active reviews unless explicitly specified
    if (query.isActive === undefined) {
      filter.isActive = true;
    }

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
    select: "ar.title en.title slug",
    options: { lean: true }   // أهم حاجة!
  })
  .lean(); // mandatory

    const total = await Review.countDocuments(filter);

    return {
      data,
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    throw ServerError("Failed to fetch reviews", err);
  }
};
