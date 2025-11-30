import {
  createBrand,
  deleteBrand,
  getBrand,
  getBrands,
  updateBrand,
} from "../services/brand.services.js";
import { StatusCodes } from "http-status-codes";
import slugify from "slugify";

export const createBrandController = async (req, res) => {
  const { name } = req.body;

  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: "Image is required",
    });
  }

  const imageURL = `uploads/brands/${req.file.filename}`;

  const result = await createBrand({
    name,
    slug: slugify(name, { lower: true }),
    image: imageURL,
  });

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Brand created successfully",
    data: result.data,
  });
};

export const getBrandsController = async (req, res) => {
  const result = await getBrands();

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "Brands fetched successfully",
    data: result.data,
  });
};

export const getBrandController = async (req, res) => {
  const { id } = req.params;
  const result = await getBrand({ id });

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message:"Brand fetched successfully",
    data: result.data,
  });
};

export const updateBrandController = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  let imageURL = undefined;
  if (req.file) {
    imageURL = `/uploads/brands/${req.file.filename}`;
  }

  const result = await updateBrand({
    id,
    name,
    image: imageURL,
  });

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "Brand updated successfully",
    data: result.data,
  });
};

export const deleteBrandController = async (req, res) => {
  const { id } = req.params;

  const result = await deleteBrand({ id });

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "Brand deleted successfully",
  });
};

