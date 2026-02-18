import Product from "../models/product.model.js";
import Tag from "../models/tag.model.js";
import { ServerError } from "../utlis/apiError.js";

/* --------------------------------------------------
   TAG AUTOMATION RULES AND THRESHOLDS
--------------------------------------------------- */
const TAG_RULES = {
  best_seller: {
    enabled: true,
    rule: "salesCount",
    threshold: "top20percent",
    minSales: 10,
  },
  hot: {
    enabled: true,
    rule: "trending",
    viewsThreshold: 100,
    daysRange: 7,
  },
  new_arrival: {
    enabled: true,
    rule: "age",
    daysThreshold: 30,
  },
  trending: {
    enabled: true,
    rule: "growth",
    growthRate: 50,
    daysRange: 7,
  },
  on_sale: {
    enabled: true,
    rule: "discount",
    minDiscountPercentage: 10,
  },
  clearance: {
    enabled: true,
    rule: "discount",
    minDiscountPercentage: 30,
  },
  top_rated: {
    enabled: true,
    rule: "rating",
    minRating: 4.5,
    minReviews: 5,
  },
  limited_edition: {
    enabled: true,
    rule: "stock",
    maxStock: 10,
    minStock: 1,
  },
};

/* --------------------------------------------------
   AUTO TAG ASSIGNMENT - MAIN FUNCTION (ObjectId-based)
--------------------------------------------------- */
export const autoAssignTagsService = async (options = {}) => {
  try {
    const {
      dryRun = false,
      tags: requestedTags = null,
      productIds = null,
    } = options;

    // Load all system tags with automation keys
    const systemTags = await Tag.find({
      automationKey: { $ne: null },
      status: "active",
    }).lean();

    const tagKeyToId = {};
    const tagIdToKey = {};
    for (const t of systemTags) {
      tagKeyToId[t.automationKey] = t._id;
      tagIdToKey[t._id.toString()] = t.automationKey;
    }

    // Filter to only requested tags (if specified)
    const activeRuleKeys = requestedTags
      ? requestedTags.filter((k) => TAG_RULES[k] && tagKeyToId[k])
      : Object.keys(TAG_RULES).filter((k) => tagKeyToId[k]);

    const results = {
      processed: 0,
      updated: 0,
      tagsAdded: {},
      tagsRemoved: {},
      errors: [],
      dryRun,
    };

    activeRuleKeys.forEach((k) => {
      results.tagsAdded[k] = 0;
      results.tagsRemoved[k] = 0;
    });

    const query = productIds ? { _id: { $in: productIds } } : {};
    const products = await Product.find(query);
    results.processed = products.length;

    for (const product of products) {
      const currentTagIds = (product.tags || []).map((t) => t.toString());
      const tagsToAdd = new Set();
      const tagsToRemove = new Set();

      for (const key of activeRuleKeys) {
        const rule = TAG_RULES[key];
        if (!rule || !rule.enabled) continue;

        const tagId = tagKeyToId[key].toString();
        const shouldHaveTag = await evaluateRule(product, key, rule);

        if (shouldHaveTag && !currentTagIds.includes(tagId)) {
          tagsToAdd.add(tagId);
        } else if (!shouldHaveTag && currentTagIds.includes(tagId)) {
          tagsToRemove.add(tagId);
        }
      }

      if (tagsToAdd.size > 0 || tagsToRemove.size > 0) {
        const newTags = [
          ...currentTagIds.filter((id) => !tagsToRemove.has(id)),
          ...tagsToAdd,
        ];

        if (!dryRun) {
          await Product.findByIdAndUpdate(product._id, { tags: newTags });
          results.updated++;
        }

        tagsToAdd.forEach((id) => {
          const key = tagIdToKey[id];
          if (key) results.tagsAdded[key]++;
        });

        tagsToRemove.forEach((id) => {
          const key = tagIdToKey[id];
          if (key) results.tagsRemoved[key]++;
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
async function evaluateBestSellerRule(product, rule) {
  if (product.salesCount < rule.minSales) return false;
  const totalProducts = await Product.countDocuments({ status: "active" });
  const higherSalesCount = await Product.countDocuments({
    status: "active",
    salesCount: { $gt: product.salesCount },
  });
  const percentile = (higherSalesCount / totalProducts) * 100;
  return percentile <= 20;
}

function evaluateHotRule(product, rule) {
  return product.views >= rule.viewsThreshold;
}

function evaluateNewArrivalRule(product, rule) {
  const daysOld =
    (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
  return daysOld <= rule.daysThreshold;
}

function evaluateTrendingRule(product, rule) {
  return product.salesCount > 5 && product.views > 50;
}

function evaluateDiscountRule(product, rule) {
  return (
    product.discountPercentage >= rule.minDiscountPercentage &&
    product.discountPrice > 0
  );
}

function evaluateRatingRule(product, rule) {
  return (
    product.ratingsAverage >= rule.minRating &&
    product.ratingsQuantity >= rule.minReviews
  );
}

function evaluateStockRule(product, rule) {
  return product.stock > 0 && product.stock <= rule.maxStock;
}

/* --------------------------------------------------
   SCHEDULED TAG CLEANUP (ObjectId-based)
--------------------------------------------------- */
export const cleanupExpiredTagsService = async () => {
  try {
    const results = {
      processed: 0,
      updated: 0,
      tagsRemoved: {},
    };

    // Load system tags by automationKey
    const newArrivalTag = await Tag.findOne({ automationKey: "new_arrival" });
    const onSaleTag = await Tag.findOne({ automationKey: "on_sale" });
    const clearanceTag = await Tag.findOne({ automationKey: "clearance" });

    // Remove 'new_arrival' from products older than 30 days
    if (newArrivalTag) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Product.updateMany(
        { tags: newArrivalTag._id, createdAt: { $lt: thirtyDaysAgo } },
        { $pull: { tags: newArrivalTag._id } }
      );
      results.updated += result.modifiedCount;
      results.tagsRemoved.new_arrival = result.modifiedCount;
    }

    // Remove sale tags from products with no discount
    const saleTagIds = [onSaleTag?._id, clearanceTag?._id].filter(Boolean);
    if (saleTagIds.length) {
      const result = await Product.updateMany(
        {
          tags: { $in: saleTagIds },
          $or: [{ discountPercentage: 0 }, { discountPrice: 0 }],
        },
        { $pull: { tags: { $in: saleTagIds } } }
      );
      results.updated += result.modifiedCount;
      results.tagsRemoved.on_sale = result.modifiedCount;
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
   TAG ASSIGNMENT PREVIEW (ObjectId-based)
--------------------------------------------------- */
export const previewTagAssignmentService = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    // Load system tags
    const systemTags = await Tag.find({
      automationKey: { $ne: null },
      status: "active",
    }).lean();

    const tagKeyToId = {};
    for (const t of systemTags) {
      tagKeyToId[t.automationKey] = t._id.toString();
    }

    const currentTagIds = (product.tags || []).map((t) => t.toString());
    const suggestedTags = [];
    const tagsToRemove = [];
    const reasoning = {};

    for (const [key, rule] of Object.entries(TAG_RULES)) {
      if (!rule.enabled || !tagKeyToId[key]) continue;

      const tagId = tagKeyToId[key];
      const shouldHaveTag = await evaluateRule(product, key, rule);
      const hasTag = currentTagIds.includes(tagId);

      reasoning[key] = {
        shouldHaveTag,
        hasTag,
        rule: rule.rule,
        reason: getReasonText(key, rule, shouldHaveTag, product),
      };

      if (shouldHaveTag && !hasTag) {
        suggestedTags.push(key);
      } else if (!shouldHaveTag && hasTag) {
        tagsToRemove.push(key);
      }
    }

    return {
      OK: true,
      message: "Tag preview generated successfully",
      data: {
        productId: product._id,
        productName: product.en?.title,
        currentTags: currentTagIds,
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
    case "age": {
      const days = Math.floor(
        (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)
      );
      return `Created ${days} days ago`;
    }
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
