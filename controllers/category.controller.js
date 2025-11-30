import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from "../services/category.services.js";
import { StatusCodes } from "http-status-codes";
import slugify from "slugify";
export const createCategoryController = async (req, res) => {
  const { name , catalog } = req.body;
  if(!req.file){
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: "Image is required",
    });
  }
  const imageUrl = `uploads/categories/${req.file.filename}`;
  const result = await createCategory({
    name,
    slug: slugify(name),
    image: imageUrl,
    catalog,
  });
  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }
  return res
    .status(StatusCodes.CREATED)
    .json({
      status: "success",
      message: "Category created successfully",
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
  return res
    .status(StatusCodes.OK)
    .json({
      status: "success",
      message: "Categories fetched successfully",
      data: result.data,
    });
};

export const getCategoryController = async (req, res) => {
  const { id } = req.params;
  const result = await getCategory({ id });
  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }

  return res
    .status(StatusCodes.OK)
    .json({
      status: "success",
      message: "Category fetched successfully",
      data: result.data,
    });
};

export const updateCategoryController = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const { catalog } = req.body;
  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: "Image is required",
    });
  }
  
  const imageURL = `/uploads/categories/${req.file.filename}`;

  const result = await updateCategory({
    id,
    name,
    slug: name ? slugify(name) : undefined,
    image: imageURL,
    catalog,
  });

  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "Category updated successfully",
    data: result.data,
  });
};

export const deleteCategoryController = async (req, res) => {
  const { id } = req.params;
  const result = await deleteCategory({ id });
  if (!result.OK) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ status: "error", message: result.error });
  }
  return res
    .status(StatusCodes.OK)
    .json({
      status: "success",
      message: "Category deleted successfully",
    });
};
