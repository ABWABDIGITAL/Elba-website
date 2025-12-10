import Blog from "../models/blog.model.js";
import {RedisHelper} from "../config/redis.js";
import ApiError, { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";

const BLOG_CACHE_PREFIX = "blog:";
const BLOGS_LIST_CACHE_KEY = "blogs:list:";
const CACHE_TTL = 1800; // 30 minutes

/* --------------------------------------------------
   BUILD BLOG DTO
--------------------------------------------------- */
const buildBlogDTO = (blog, language = "ar") => {
  const langData = blog?.[language] || {};

  return {
    id: blog?._id,
    title: langData?.title || "",
    subTitle: langData?.subTitle || "",
    slug: langData?.slug || "",
    content: langData?.content || "",
    featuredImage: blog?.featuredImage || null,
    category: blog?.category || null,
    author: blog?.author || null,
    status: blog?.status || null,
    publishedAt: blog?.publishedAt || null,

    views: blog?.views || 0,
    likes: blog?.likes || 0,
    shares: blog?.shares || 0,

    readingTime: blog?.readingTime?.[language] || null,

    isFeatured: blog?.isFeatured || false,
    allowComments: blog?.allowComments || true,

    relatedProducts: blog?.relatedProducts || [],

    seo: {
      ...(langData?.seo || {}),
      canonicalUrl: blog?.seo?.canonicalUrl || null,
      ogImage: blog?.seo?.ogImage || null,
      structuredData: blog?.seo?.structuredData || null,
    },

    createdAt: blog?.createdAt,
    updatedAt: blog?.updatedAt,
  };
};
const buildSimpleBlogDTO = (blog, language = "ar") => {
  const lang = blog?.[language] || {};

  return {
    id: blog._id,
    title: lang.title || "",
    subTitle: lang.subTitle || "",
    featuredImage: blog.featuredImage || null,
    slug: lang.slug || "",
  };
};


/* --------------------------------------------------
   CREATE BLOG POST (ADMIN)
--------------------------------------------------- */
export const createBlogService = async (blogData, authorId) => {
  try {
    const blog = await Blog.create({
      ...blogData,
      author: authorId,
    });

    // Clear cache
    await RedisHelper.del(`${BLOGS_LIST_CACHE_KEY}*`);

    return blog;
  } catch (err) {
    throw ServerError("Failed to create blog post", err);
  }
};

/* --------------------------------------------------
   GET ALL BLOGS (PUBLIC)
--------------------------------------------------- */
export const getAllBlogsService = async (query = {}) => {
  try {
    console.log('getAllBlogsService - Query:', JSON.stringify(query, null, 2));
    
    const {
      page = 1,
      limit = 12,
      category,
      tag,
      status = "published",
      featured,
      search,
      language = "ar",
    } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (tag) {
      filter[`${language}.tags`] = tag;
    }
    if (featured !== undefined) filter.isFeatured = featured === "true";

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    console.log('Filter:', JSON.stringify(filter, null, 2));

    // Try cache
    const cacheKey = `${BLOGS_LIST_CACHE_KEY}${JSON.stringify(filter)}:${page}:${limit}`;
    console.log('Cache Key:', cacheKey);
    
    try {
      const cached = await RedisHelper.get(cacheKey);
      if (cached) {
        console.log('Returning from cache');
        return { fromCache: true, data: JSON.parse(cached) };
      }
    } catch (cacheErr) {
      console.error('Cache error (non-fatal):', cacheErr);
      // Continue with DB query if cache fails
    }

    let mongooseQuery = Blog.find(filter)
      .populate("author", "name")
      .select({
        featuredImage: 1,
        category: 1,
        publishedAt: 1,
        [`${language}.title`]: 1,
        [`${language}.subtitle`]: 1,
        [`${language}.slug`]: 1,
      })

    // Sorting
    if (search) {
      mongooseQuery = mongooseQuery.sort({ score: { $meta: "textScore" } });
    } else {
      mongooseQuery = mongooseQuery.sort({ publishedAt: -1, createdAt: -1 });
    }

    console.log('Executing DB query...');
    const blogs = await mongooseQuery.skip(skip).limit(parseInt(limit)).lean();
    console.log(`Found ${blogs.length} blogs`);

    const total = await Blog.countDocuments(filter);
    console.log('Total blogs matching filter:', total);

    const result = {
      blogs: blogs.map(blog => buildSimpleBlogDTO(blog, language)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache result
    try {
      await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
      console.log('Result cached successfully');
    } catch (cacheErr) {
      console.error('Failed to cache result:', cacheErr);
      // Non-fatal error, continue
    }

    return { fromCache: false, data: result };
  } catch (err) {
    console.error('Error in getAllBlogsService:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name,
      query: query,
    });
    throw new Error("Failed to get blogs", {
      originalError: {
        message: err.message,
        code: err.code,
        stack: err.stack
      }
    });
  }
};
export const getBlogBySlugService = async (slug, language = "ar") => {
  try {
    console.log(`\n🔍 FETCH BLOG BY SLUG: "${slug}" | lang: ${language}`);

    const cacheKey = `${BLOG_CACHE_PREFIX}slug:${slug}:${language}`;

    /* ---------------------------------------------
        1) CHECK CACHE (and validate JSON)
    --------------------------------------------- */
    const cached = await RedisHelper.get(cacheKey).catch(err => {
      console.log("⚠️ RedisHelper read error:", err.message);
    });

    if (cached) {
      console.log("📦 Cached result found. Validating JSON...");

      try {
        const parsed = JSON.parse(cached);
        return { fromCache: true, data: parsed };
      } catch (e) {
        console.log("❌ Bad cache format. Clearing key...");
        await RedisHelper.del(cacheKey);
      }
    }

    /* ---------------------------------------------
        2) BUILD PRIMARY (LANG-SPECIFIC) QUERY
    --------------------------------------------- */
    const primaryQuery = {
      [`${language}.slug`]: slug,
      status: "published",
      isActive: true,
    };

    console.log("🔎 Primary query:", primaryQuery);

    let blog = await Blog.findOne(primaryQuery)
      .populate("author", "name")
      .populate("relatedProducts", "en.name ar.name en.slug ar.slug images")
      .lean();

    console.log("➡ Primary result:", blog ? "FOUND" : "NOT FOUND");

    /* ---------------------------------------------
        3) FALLBACK TO OTHER LANGUAGE IF NOT FOUND
    --------------------------------------------- */
    if (!blog) {
      const fallbackLang = language === "ar" ? "en" : "ar";

      const fallbackQuery = {
        [`${fallbackLang}.slug`]: slug,
        status: "published",
        isActive: true,
      };

      console.log("🔄 Fallback query:", fallbackQuery);

      blog = await Blog.findOne(fallbackQuery)
        .populate("author", "name")
        .populate("relatedProducts", "en.name ar.name en.slug ar.slug images")
        .lean();

      console.log("➡ Fallback result:", blog ? "FOUND" : "NOT FOUND");
    }

    /* ---------------------------------------------
        4) STILL NOT FOUND → THROW ERR
    --------------------------------------------- */
    if (!blog) {
      console.log("❌ Blog not found in any language");
      throw NotFound("Blog post not found");
    }

    console.log("✅ BLOG FOUND:", blog._id);

    /* ---------------------------------------------
        5) INCREMENT VIEWS (non-blocking)
    --------------------------------------------- */
    Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).exec();

    /* ---------------------------------------------
        6) BUILD DTO
    --------------------------------------------- */
    const result = buildBlogDTO(blog, language);

    /* ---------------------------------------------
        7) CACHE THE RESULT SAFELY
    --------------------------------------------- */
    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    console.log("💾 Blog cached:", cacheKey);

    return { fromCache: false, data: result };
  } catch (err) {
    console.log("💥 ERROR in getBlogBySlugService:", err.message);
    throw ServerError("Failed to get blog", err);
  }
};
  


/* --------------------------------------------------
   GET BLOG BY ID (ADMIN)
--------------------------------------------------- */
export const getBlogByIdService = async (blogId) => {
  try {
    const blog = await Blog.findById(blogId)
      .populate("author", "name email")
      .populate("relatedProducts")
      .lean();

    if (!blog) {
      throw NotFound("Blog post not found");
    }

    return blog;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to get blog", err);
  }
};

/* --------------------------------------------------
   UPDATE BLOG (ADMIN)
--------------------------------------------------- */
export const updateBlogService = async (blogId, updates) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      updates,
      { new: true, runValidators: true }
    )
      .populate("author", "name")
      .populate("relatedProducts");

    if (!blog) {
      throw NotFound("Blog post not found");
    }

    // Clear cache
    await RedisHelper.del(`${BLOG_CACHE_PREFIX}*`);
    await RedisHelper.del(`${BLOGS_LIST_CACHE_KEY}*`);

    return blog;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to update blog", err);
  }
};

/* --------------------------------------------------
   DELETE BLOG (ADMIN)
--------------------------------------------------- */
export const deleteBlogService = async (blogId) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { isActive: false },
      { new: true }
    );

    if (!blog) {
      throw NotFound("Blog post not found");
    }

    // Clear cache
    await RedisHelper.del(`${BLOG_CACHE_PREFIX}*`);
    await RedisHelper.del(`${BLOGS_LIST_CACHE_KEY}*`);

    return blog;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to delete blog", err);
  }
};

/* --------------------------------------------------
   GET FEATURED BLOGS (PUBLIC)
--------------------------------------------------- */
export const getFeaturedBlogsService = async (limit = 5, language = "ar") => {
  try {
    const cacheKey = `${BLOG_CACHE_PREFIX}featured:${limit}:${language}`;
    const cached = await RedisHelper.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blogs = await Blog.getFeatured(limit);
    const result = blogs.map(blog => buildBlogDTO(blog, language));

    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    throw ServerError("Failed to get featured blogs", err);
  }
};

/* --------------------------------------------------
   GET TRENDING BLOGS (PUBLIC)
--------------------------------------------------- */
export const getTrendingBlogsService = async (limit = 5, language = "ar") => {
  try {
    const cacheKey = `${BLOG_CACHE_PREFIX}trending:${limit}:${language}`;
    const cached = await RedisHelper.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blogs = await Blog.getTrending(limit);
    const result = blogs.map(blog => buildBlogDTO(blog, language));

    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    throw ServerError("Failed to get trending blogs", err);
  }
};

/* --------------------------------------------------
   GET RECENT BLOGS (PUBLIC)
--------------------------------------------------- */
export const getRecentBlogsService = async (limit = 10, language = "ar") => {
  try {
    const cacheKey = `${BLOG_CACHE_PREFIX}recent:${limit}:${language}`;
    const cached = await RedisHelper.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blogs = await Blog.getRecent(limit);
    const result = blogs.map(blog => buildBlogDTO(blog, language));

    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    throw ServerError("Failed to get recent blogs", err);
  }
};

/* --------------------------------------------------
   GET BLOGS BY CATEGORY (PUBLIC)
--------------------------------------------------- */
export const getBlogsByCategoryService = async (category, limit = 10, language = "ar") => {
  try {
    const cacheKey = `${BLOG_CACHE_PREFIX}category:${category}:${limit}:${language}`;
    const cached = await RedisHelper.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blogs = await Blog.getByCategory(category, limit);
    const result = blogs.map(blog => buildBlogDTO(blog, language));

    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    throw ServerError("Failed to get blogs by category", err);
  }
};

/* --------------------------------------------------
   GET BLOG CATEGORIES WITH COUNTS
--------------------------------------------------- */
export const getBlogCategoriesService = async () => {
  try {
    const cacheKey = `${BLOG_CACHE_PREFIX}categories`;
    const cached = await RedisHelper.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const categories = await Blog.aggregate([
      {
        $match: {
          status: "published",
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    await RedisHelper.set(cacheKey, JSON.stringify(categories), { ex: CACHE_TTL });

    return { fromCache: false, data: categories };
  } catch (err) {
    throw ServerError("Failed to get blog categories", err);
  }
};

/* --------------------------------------------------
   INCREMENT LIKES
--------------------------------------------------- */
export const incrementLikesService = async (blogId) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!blog) {
      throw NotFound("Blog post not found");
    }

    // Clear cache
    await RedisHelper.del(`${BLOG_CACHE_PREFIX}*`);

    return blog;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to like blog", err);
  }
};

/* --------------------------------------------------
   INCREMENT SHARES
--------------------------------------------------- */
export const incrementSharesService = async (blogId) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!blog) {
      throw NotFound("Blog post not found");
    }

    // Clear cache
    await RedisHelper.del(`${BLOG_CACHE_PREFIX}*`);

    return blog;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to track share", err);
  }
};
