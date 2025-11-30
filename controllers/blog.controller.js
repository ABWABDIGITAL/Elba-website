import {
  createBlogService,
  getAllBlogsService,
  getBlogBySlugService,
  getBlogByIdService,
  updateBlogService,
  deleteBlogService,
  getFeaturedBlogsService,
  getTrendingBlogsService,
  getRecentBlogsService,
  getBlogsByCategoryService,
  getBlogCategoriesService,
  incrementLikesService,
  incrementSharesService,
} from "../services/blog.services.js";
import { StatusCodes } from "http-status-codes";

/* --------------------------------------------------
   CREATE BLOG (ADMIN)
--------------------------------------------------- */
export const createBlog = async (req, res, next) => {
  try {
    const blogData = req.body;
    const blog = await createBlogService(blogData, req.user.id);

    res.status(StatusCodes.CREATED).json({
      OK: true,
      message: "Blog post created successfully",
      data: blog,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET ALL BLOGS (PUBLIC)
--------------------------------------------------- */
export const getAllBlogs = async (req, res, next) => {
  try {
    const result = await getAllBlogsService(req.query);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Blogs fetched successfully",
      fromCache: result.fromCache,
      ...result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET BLOG BY SLUG (PUBLIC)
--------------------------------------------------- */
export const getBlogBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { language = "ar" } = req.query;

    const result = await getBlogBySlugService(slug, language);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Blog fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET BLOG BY ID (ADMIN)
--------------------------------------------------- */
export const getBlogById = async (req, res, next) => {
  try {
    const { blogId } = req.params;
    const blog = await getBlogByIdService(blogId);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Blog fetched successfully",
      data: blog,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   UPDATE BLOG (ADMIN)
--------------------------------------------------- */
export const updateBlog = async (req, res, next) => {
  try {
    const { blogId } = req.params;
    const updates = req.body;

    const blog = await updateBlogService(blogId, updates);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   DELETE BLOG (ADMIN)
--------------------------------------------------- */
export const deleteBlog = async (req, res, next) => {
  try {
    const { blogId } = req.params;
    await deleteBlogService(blogId);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Blog deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET FEATURED BLOGS (PUBLIC)
--------------------------------------------------- */
export const getFeaturedBlogs = async (req, res, next) => {
  try {
    const { limit = 5, language = "ar" } = req.query;
    const result = await getFeaturedBlogsService(parseInt(limit), language);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Featured blogs fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET TRENDING BLOGS (PUBLIC)
--------------------------------------------------- */
export const getTrendingBlogs = async (req, res, next) => {
  try {
    const { limit = 5, language = "ar" } = req.query;
    const result = await getTrendingBlogsService(parseInt(limit), language);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Trending blogs fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET RECENT BLOGS (PUBLIC)
--------------------------------------------------- */
export const getRecentBlogs = async (req, res, next) => {
  try {
    const { limit = 10, language = "ar" } = req.query;
    const result = await getRecentBlogsService(parseInt(limit), language);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Recent blogs fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET BLOGS BY CATEGORY (PUBLIC)
--------------------------------------------------- */
export const getBlogsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { limit = 10, language = "ar" } = req.query;

    const result = await getBlogsByCategoryService(category, parseInt(limit), language);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Blogs by category fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET BLOG CATEGORIES (PUBLIC)
--------------------------------------------------- */
export const getBlogCategories = async (req, res, next) => {
  try {
    const result = await getBlogCategoriesService();

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Blog categories fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   INCREMENT LIKES (PUBLIC)
--------------------------------------------------- */
export const incrementLikes = async (req, res, next) => {
  try {
    const { blogId } = req.params;
    const blog = await incrementLikesService(blogId);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Blog liked successfully",
      likes: blog.likes,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   INCREMENT SHARES (PUBLIC)
--------------------------------------------------- */
export const incrementShares = async (req, res, next) => {
  try {
    const { blogId } = req.params;
    const blog = await incrementSharesService(blogId);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Share tracked successfully",
      shares: blog.shares,
    });
  } catch (err) {
    next(err);
  }
};
