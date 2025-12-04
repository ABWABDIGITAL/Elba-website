import Blog from "../models/blog.model.js";
import {RedisHelper} from "../config/redis.js";
import { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";

const BLOG_CACHE_PREFIX = "blog:";
const BLOGS_LIST_CACHE_KEY = "blogs:list:";
const CACHE_TTL = 1800; // 30 minutes

/* --------------------------------------------------
   BUILD BLOG DTO
--------------------------------------------------- */
const buildBlogDTO = (blog, language = "ar") => {
  const langData = blog[language] || blog.ar; // Fallback to Arabic if language data missing

  return {
    id: blog._id,
    ...langData, // Spread all language-specific data (title, slug, excerpt, content, etc.)
    featuredImage: blog.featuredImage,
    category: blog.category,
    author: blog.author,
    status: blog.status,
    publishedAt: blog.publishedAt,
    views: blog.views,
    likes: blog.likes,
    shares: blog.shares,
    readingTime: blog.readingTime[language],
    isFeatured: blog.isFeatured,
    allowComments: blog.allowComments,
    relatedProducts: blog.relatedProducts,
    seo: {
      ...langData.seo,
      canonicalUrl: blog.seo?.canonicalUrl,
      ogImage: blog.seo?.ogImage,
      structuredData: blog.seo?.structuredData,
    },
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
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
    await redis.del(`${BLOGS_LIST_CACHE_KEY}*`);

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

    // Try cache
    const cacheKey = `${BLOGS_LIST_CACHE_KEY}${JSON.stringify(filter)}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    let mongooseQuery = Blog.find(filter)
      .populate("author", "name")
      .populate("relatedProducts", "en.name ar.name en.slug ar.slug images");

    // Sorting
    if (search) {
      mongooseQuery = mongooseQuery.sort({ score: { $meta: "textScore" } });
    } else {
      mongooseQuery = mongooseQuery.sort({ publishedAt: -1, createdAt: -1 });
    }

    const blogs = await mongooseQuery.skip(skip).limit(parseInt(limit)).lean();

    const total = await Blog.countDocuments(filter);

    const result = {
      blogs: blogs.map(blog => buildBlogDTO(blog, language)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache result
    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    throw ServerError("Failed to get blogs", err);
  }
};

/* --------------------------------------------------
   GET BLOG BY SLUG (PUBLIC)
--------------------------------------------------- */
export const getBlogBySlugService = async (slug, language = "ar") => {
  try {
    const cacheKey = `${BLOG_CACHE_PREFIX}slug:${slug}:${language}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blog = await Blog.findOne({
      [`${language}.slug`]: slug,
      status: "published",
      isActive: true,
    })
      .populate("author", "name")
      .populate("relatedProducts", "en.name ar.name en.slug ar.slug images")
      .lean();

    if (!blog) {
      throw NotFound("Blog post not found");
    }

    // Increment views (async)
    Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).exec();

    const result = buildBlogDTO(blog, language);

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    if (err instanceof NotFound) throw err;
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
    await redis.del(`${BLOG_CACHE_PREFIX}*`);
    await redis.del(`${BLOGS_LIST_CACHE_KEY}*`);

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
    await redis.del(`${BLOG_CACHE_PREFIX}*`);
    await redis.del(`${BLOGS_LIST_CACHE_KEY}*`);

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
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blogs = await Blog.getFeatured(limit);
    const result = blogs.map(blog => buildBlogDTO(blog, language));

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

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
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blogs = await Blog.getTrending(limit);
    const result = blogs.map(blog => buildBlogDTO(blog, language));

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

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
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blogs = await Blog.getRecent(limit);
    const result = blogs.map(blog => buildBlogDTO(blog, language));

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

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
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const blogs = await Blog.getByCategory(category, limit);
    const result = blogs.map(blog => buildBlogDTO(blog, language));

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

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
    const cached = await redis.get(cacheKey);
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

    await redis.set(cacheKey, JSON.stringify(categories), { ex: CACHE_TTL });

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
    await redis.del(`${BLOG_CACHE_PREFIX}*`);

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
    await redis.del(`${BLOG_CACHE_PREFIX}*`);

    return blog;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to track share", err);
  }
};
