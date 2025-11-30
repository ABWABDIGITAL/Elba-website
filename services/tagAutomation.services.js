import Product from "../models/product.model.js";
import { ServerError } from "../utlis/apiError.js";

/* --------------------------------------------------
   TAG AUTOMATION RULES AND THRESHOLDS
--------------------------------------------------- */
const TAG_RULES = {
  // Best Seller: Top 20% of products by sales count
  best_seller: {
    enabled: true,
    rule: "salesCount",
    threshold: "top20percent",
    minSales: 10, // Minimum sales to qualify
  },

  // Hot: Products with high views in last 7 days AND good conversion
  hot: {
    enabled: true,
    rule: "trending",
    viewsThreshold: 100,
    daysRange: 7,
  },

  // New Arrival: Products created in last 30 days
  new_arrival: {
    enabled: true,
    rule: "age",
    daysThreshold: 30,
  },

  // Trending: High growth in sales/views recently
  trending: {
    enabled: true,
    rule: "growth",
    growthRate: 50, // 50% increase in last week
    daysRange: 7,
  },

  // On Sale: Products with discount > 10%
  on_sale: {
    enabled: true,
    rule: "discount",
    minDiscountPercentage: 10,
  },

  // Clearance: Products with discount > 30%
  clearance: {
    enabled: true,
    rule: "discount",
    minDiscountPercentage: 30,
  },

  // Top Rated: Products with rating >= 4.5 and min reviews
  top_rated: {
    enabled: true,
    rule: "rating",
    minRating: 4.5,
    minReviews: 5,
  },

  // Limited Edition: Low stock (< 10 units)
  limited_edition: {
    enabled: true,
    rule: "stock",
    maxStock: 10,
    minStock: 1,
  },
};

/* --------------------------------------------------
   AUTO TAG ASSIGNMENT - MAIN FUNCTION
--------------------------------------------------- */
export const autoAssignTagsService = async (options = {}) => {
  try {
    const {
      dryRun = false,
      tags = Object.keys(TAG_RULES),
      productIds = null,
    } = options;

    const results = {
      processed: 0,
      updated: 0,
      tagsAdded: {},
      tagsRemoved: {},
      errors: [],
      dryRun,
    };

    // Initialize tag counters
    tags.forEach((tag) => {
      results.tagsAdded[tag] = 0;
      results.tagsRemoved[tag] = 0;
    });

    // Get all products or specific ones
    const query = productIds ? { _id: { $in: productIds } } : {};
    const products = await Product.find(query);

    results.processed = products.length;

    for (const product of products) {
      const tagsToAdd = new Set();
      const tagsToRemove = new Set(product.tags || []);

      // Apply each enabled rule
      for (const tag of tags) {
        const rule = TAG_RULES[tag];
        if (!rule || !rule.enabled) continue;

        const shouldHaveTag = await evaluateRule(product, tag, rule);

        if (shouldHaveTag) {
          tagsToAdd.add(tag);
          tagsToRemove.delete(tag);
        } else {
          tagsToRemove.add(tag);
          tagsToAdd.delete(tag);
        }
      }

      // Update product if changes needed
      if (tagsToAdd.size > 0 || tagsToRemove.size > 0) {
        const newTags = [
          ...new Set([
            ...(product.tags || []).filter((t) => !tagsToRemove.has(t)),
            ...tagsToAdd,
          ]),
        ];

        if (!dryRun) {
          await Product.findByIdAndUpdate(product._id, { tags: newTags });
          results.updated++;
        }

        // Count changes
        tagsToAdd.forEach((tag) => {
          if (!product.tags?.includes(tag)) {
            results.tagsAdded[tag]++;
          }
        });

        tagsToRemove.forEach((tag) => {
          if (product.tags?.includes(tag)) {
            results.tagsRemoved[tag]++;
          }
        });
      }
    }

    return {
      OK: true,
      message: dryRun
        ? "Dry run completed - no changes made"
        : "Tag automation completed successfully",
      data: results,
    };
  } catch (err) {
    throw ServerError("Failed to auto-assign tags", err);
  }
};

/* --------------------------------------------------
   RULE EVALUATION LOGIC
--------------------------------------------------- */
async function evaluateRule(product, tag, rule) {
  switch (rule.rule) {
    case "salesCount":
      return await evaluateBestSellerRule(product, rule);

    case "trending":
      return evaluateHotRule(product, rule);

    case "age":
      return evaluateNewArrivalRule(product, rule);

    case "growth":
      return evaluateTrendingRule(product, rule);

    case "discount":
      return evaluateDiscountRule(product, rule);

    case "rating":
      return evaluateRatingRule(product, rule);

    case "stock":
      return evaluateStockRule(product, rule);

    default:
      return false;
  }
}

/* --------------------------------------------------
   INDIVIDUAL RULE EVALUATORS
--------------------------------------------------- */

// Best Seller: Top 20% by sales count
async function evaluateBestSellerRule(product, rule) {
  if (product.salesCount < rule.minSales) return false;

  // Get total products count
  const totalProducts = await Product.countDocuments({
    status: "active",
  });

  // Get count of products with higher sales
  const higherSalesCount = await Product.countDocuments({
    status: "active",
    salesCount: { $gt: product.salesCount },
  });

  // Product is in top 20%?
  const percentile = (higherSalesCount / totalProducts) * 100;
  return percentile <= 20;
}

// Hot: High views recently
function evaluateHotRule(product, rule) {
  return product.views >= rule.viewsThreshold;
}

// New Arrival: Created recently
function evaluateNewArrivalRule(product, rule) {
  const daysOld =
    (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
  return daysOld <= rule.daysThreshold;
}

// Trending: Would need historical data - simplified version
function evaluateTrendingRule(product, rule) {
  // Simplified: High sales + high views
  return product.salesCount > 5 && product.views > 50;
}

// Discount rules
function evaluateDiscountRule(product, rule) {
  return (
    product.discountPercentage >= rule.minDiscountPercentage &&
    product.discountPrice > 0
  );
}

// Rating rule
function evaluateRatingRule(product, rule) {
  return (
    product.ratingsAverage >= rule.minRating &&
    product.ratingsQuantity >= rule.minReviews
  );
}

// Stock rule
function evaluateStockRule(product, rule) {
  return product.stock > 0 && product.stock <= rule.maxStock;
}

/* --------------------------------------------------
   SCHEDULED TAG CLEANUP
--------------------------------------------------- */
export const cleanupExpiredTagsService = async () => {
  try {
    const results = {
      processed: 0,
      updated: 0,
      tagsRemoved: {},
    };

    // Remove 'new_arrival' from products older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const oldProducts = await Product.find({
      tags: "new_arrival",
      createdAt: { $lt: thirtyDaysAgo },
    });

    results.processed = oldProducts.length;

    for (const product of oldProducts) {
      const newTags = product.tags.filter((t) => t !== "new_arrival");
      await Product.findByIdAndUpdate(product._id, { tags: newTags });
      results.updated++;
      results.tagsRemoved.new_arrival =
        (results.tagsRemoved.new_arrival || 0) + 1;
    }

    // Remove sale tags from products with no discount
    const nonSaleProducts = await Product.find({
      tags: { $in: ["on_sale", "clearance"] },
      $or: [{ discountPercentage: 0 }, { discountPrice: 0 }],
    });

    for (const product of nonSaleProducts) {
      const newTags = product.tags.filter(
        (t) => t !== "on_sale" && t !== "clearance"
      );
      await Product.findByIdAndUpdate(product._id, { tags: newTags });
      results.updated++;
      results.tagsRemoved.on_sale = (results.tagsRemoved.on_sale || 0) + 1;
    }

    return {
      OK: true,
      message: "Tag cleanup completed successfully",
      data: results,
    };
  } catch (err) {
    throw ServerError("Failed to cleanup expired tags", err);
  }
};

/* --------------------------------------------------
   GET TAG AUTOMATION RULES
--------------------------------------------------- */
export const getTagAutomationRulesService = () => {
  return {
    OK: true,
    message: "Tag automation rules fetched successfully",
    data: TAG_RULES,
  };
};

/* --------------------------------------------------
   UPDATE TAG AUTOMATION RULES
--------------------------------------------------- */
export const updateTagAutomationRulesService = (tag, updates) => {
  if (!TAG_RULES[tag]) {
    throw new Error(`Invalid tag: ${tag}`);
  }

  TAG_RULES[tag] = { ...TAG_RULES[tag], ...updates };

  return {
    OK: true,
    message: "Tag automation rule updated successfully",
    data: TAG_RULES[tag],
  };
};

/* --------------------------------------------------
   TAG ASSIGNMENT PREVIEW (DRY RUN)
--------------------------------------------------- */
export const previewTagAssignmentService = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const currentTags = product.tags || [];
    const suggestedTags = [];
    const tagsToRemove = [];
    const reasoning = {};

    for (const [tag, rule] of Object.entries(TAG_RULES)) {
      if (!rule.enabled) continue;

      const shouldHaveTag = await evaluateRule(product, tag, rule);
      const hasTag = currentTags.includes(tag);

      reasoning[tag] = {
        shouldHaveTag,
        hasTag,
        rule: rule.rule,
        reason: getReasonText(tag, rule, shouldHaveTag, product),
      };

      if (shouldHaveTag && !hasTag) {
        suggestedTags.push(tag);
      } else if (!shouldHaveTag && hasTag) {
        tagsToRemove.push(tag);
      }
    }

    return {
      OK: true,
      message: "Tag preview generated successfully",
      data: {
        productId: product._id,
        productName: product.en.name,
        currentTags,
        suggestedTags,
        tagsToRemove,
        reasoning,
      },
    };
  } catch (err) {
    throw ServerError("Failed to preview tag assignment", err);
  }
};

/* --------------------------------------------------
   HELPER: Generate reasoning text
--------------------------------------------------- */
function getReasonText(tag, rule, shouldHaveTag, product) {
  if (!shouldHaveTag) return "Does not meet criteria";

  switch (rule.rule) {
    case "salesCount":
      return `In top 20% with ${product.salesCount} sales`;
    case "trending":
      return `High views: ${product.views}`;
    case "age":
      const days = Math.floor(
        (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)
      );
      return `Created ${days} days ago`;
    case "discount":
      return `${product.discountPercentage}% discount`;
    case "rating":
      return `Rating: ${product.ratingsAverage} (${product.ratingsQuantity} reviews)`;
    case "stock":
      return `Only ${product.stock} units left`;
    default:
      return "Meets criteria";
  }
}
