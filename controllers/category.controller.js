import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from "../services/category.services.js";

import { StatusCodes } from "http-status-codes";

export const createCategoryController = async (req, res) => {
  const { ar, en, sizeType , status } = req.body;

  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: "Image is required",
    });
  }

  const imageUrl = `uploads/categories/${req.file.filename}`;

  const result = await createCategory({
    ar,
    en,
    sizeType,
    image: imageUrl,
    status,
  });

  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }

  res.status(StatusCodes.CREATED).json({
    status: "success",
    data: result.data,
  });
};


export const updateCategoryController = async (req, res) => {
  const { ar, en, sizeType,status } = req.body;

  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: "Image is required",
    });
  }

  const imageUrl = `uploads/categories/${req.file.filename}`;

  const result = await updateCategory({
    id: req.params.id,
    ar,
    en,
    sizeType,
    image: imageUrl,
    status,
  });

  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    data: result.data,
  });
};
export const getCategoriesController = async (req, res) => {
  const result = await getCategories();

  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    data: result.data,
  });
};
export const getCategoryController = async (req, res) => {
 try {
   const result = await getCategory({ id: req.params.id });

  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    data: result.data,
  });
 } catch (error) {
  if (err instanceof ApiError) throw err;
    console.error("GET CATEGORY ERROR 👉", err);
    throw ServerError("Failed to get category", {
      message: err.message,
      name: err.name,
      stack: err.stack,
    });
 }
};
export const deleteCategoryController = async (req, res) => {
  const result = await deleteCategory({ id: req.params.id });

  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Category deleted successfully",
  });
};
