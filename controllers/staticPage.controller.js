import {
  getPageByTypeService,
  getAllPagesService,
  getPageByIdService,
  createPageService,
  updatePageService,
  deletePageService,
} from "../services/staticPage.services.js";
import { StatusCodes } from "http-status-codes";

/* --------------------------------------------------
   GET PAGE BY TYPE (PUBLIC)
--------------------------------------------------- */
export const getPageByType = async (req, res, next) => {
  try {
    const { pageType } = req.params;
    const { language = "ar" } = req.query;

    const result = await getPageByTypeService(pageType, language);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Page fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET ALL PAGES (PUBLIC)
--------------------------------------------------- */
export const getAllPages = async (req, res, next) => {
  try {
    const { language = "ar" } = req.query;
    const result = await getAllPagesService(language);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Pages fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET PAGE BY ID (ADMIN)
--------------------------------------------------- */
export const getPageById = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const page = await getPageByIdService(pageId);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Page fetched successfully",
      data: page,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   CREATE PAGE (ADMIN)
--------------------------------------------------- */
export const createPage = async (req, res, next) => {
  try {
    const pageData = req.body;
    const page = await createPageService(pageData, req.user.id);

    res.status(StatusCodes.CREATED).json({
      OK: true,
      message: "Page created successfully",
      data: page,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   UPDATE PAGE (ADMIN)
--------------------------------------------------- */
export const updatePage = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const updates = req.body;

    const page = await updatePageService(pageId, updates, req.user.id);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Page updated successfully",
      data: page,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   DELETE PAGE (ADMIN)
--------------------------------------------------- */
export const deletePage = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    await deletePageService(pageId);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Page deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
