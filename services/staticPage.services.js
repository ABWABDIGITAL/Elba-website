import StaticPage from "../models/staticPage.model.js";
import {RedisHelper} from "../config/redis.js";
import { NotFound, ServerError } from "../utlis/apiError.js";

const PAGE_CACHE_PREFIX = "page:";
const CACHE_TTL = 3600; // 1 hour

/* --------------------------------------------------
   GET PAGE BY TYPE (PUBLIC)
--------------------------------------------------- */
export const getPageByTypeService = async (pageType, language = "ar") => {
  try {
    const cacheKey = `${PAGE_CACHE_PREFIX}${pageType}:${language}`;
    const cached = await RedisHelper.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    // Static pages are now separate documents per language
    const page = await StaticPage.getByType(pageType, language);

    if (!page) {
      throw NotFound(`Page not found: ${pageType} (${language})`);
    }

    // Page data is already in the correct language (no DTO needed)
    const result = {
      id: page._id,
      pageType: page.pageType,
      language: page.language,
      title: page.title,
      slug: page.slug,
      content: page.content,
      sections: page.sections || [],
      seo: page.seo || {},
      lastReviewedDate: page.lastReviewedDate,
      version: page.version,
      status: page.status,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
    };

    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to get page", err);
  }
};

/* --------------------------------------------------
   GET ALL PAGES (PUBLIC)
--------------------------------------------------- */
export const getAllPagesService = async (language = "ar") => {
  try {
    const cacheKey = `${PAGE_CACHE_PREFIX}all:${language}`;
    const cached = await RedisHelper.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const pages = await StaticPage.getAllPublished(language) || [];


    const result = pages.map(page => ({
      id: page._id,
      pageType: page.pageType,
      language: page.language,
      title: page.title,
      slug: page.slug,
      content: page.content,
      sections: page.sections || [],
      seo: page.seo || {},
      lastReviewedDate: page.lastReviewedDate,
      version: page.version,
      status: page.status,
      publishedAt: page.publishedAt,
    }));
    console.log(result);
    console.log(pages);


    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    console.error("getAllPagesService ERROR:", err);
    throw ServerError("Failed to get pages", err);
  }
};

/* --------------------------------------------------
   GET PAGE BY ID (ADMIN)
--------------------------------------------------- */
export const getPageByIdService = async (pageId) => {
  try {
    const page = await StaticPage.findById(pageId)
      .populate("lastUpdatedBy", "name email")
      .lean();

    if (!page) {
      throw NotFound("Page not found");
    }

    return page;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to get page", err);
  }
};

/* --------------------------------------------------
   CREATE PAGE (ADMIN)
--------------------------------------------------- */
export const createPageService = async (pageData, userId) => {
  try {
    const page = await StaticPage.create({
      ...pageData,
      lastUpdatedBy: userId,
    });

    // Clear cache for both languages
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}${page.pageType}:ar`);
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}${page.pageType}:en`);
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}all:ar`);
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}all:en`);

    return page;
  } catch (err) {
    throw ServerError("Failed to create page", err);
  }
};

/* --------------------------------------------------
   UPDATE PAGE (ADMIN)
--------------------------------------------------- */
export const updatePageService = async (pageId, updates, userId) => {
  try {
    const page = await StaticPage.findByIdAndUpdate(
      pageId,
      {
        ...updates,
        lastUpdatedBy: userId,
      },
      { new: true, runValidators: true }
    ).populate("lastUpdatedBy", "name email");

    if (!page) {
      throw NotFound("Page not found");
    }

    // Clear cache for this page type in both languages
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}${page.pageType}:ar`);
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}${page.pageType}:en`);
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}all:ar`);
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}all:en`);

    return page;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to update page", err);
  }
};

/* --------------------------------------------------
   DELETE PAGE (ADMIN)
--------------------------------------------------- */
export const deletePageService = async (pageId) => {
  try {
    const page = await StaticPage.findByIdAndUpdate(
      pageId,
      { isActive: false },
      { new: true }
    );

    if (!page) {
      throw NotFound("Page not found");
    }

    // Clear cache
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}${page.pageType}:${page.language}`);
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}all:ar`);
    await RedisHelper.del(`${PAGE_CACHE_PREFIX}all:en`);

    return page;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to delete page", err);
  }
};

/* --------------------------------------------------
   SEED DEFAULT PAGES
--------------------------------------------------- */
export const seedDefaultPagesService = async () => {
  try {
    // Note: Static pages are now separate documents per language
    // This function is deprecated - use the seeder.js instead
    console.log("⚠ seedDefaultPagesService is deprecated. Use seeder.js instead.");

    return {
      OK: true,
      message: "Please use the main seeder (seeder.js) to seed static pages",
    };
  } catch (err) {
    throw ServerError("Failed to seed default pages", err);
  }
};
