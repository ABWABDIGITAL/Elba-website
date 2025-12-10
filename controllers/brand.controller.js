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

  const enName = req.body?.en?.name;
  const arName = req.body?.ar?.name;

  console.log("EN:", enName, "AR:", arName);

  if (!enName || !arName) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: "Both English and Arabic names are required",
    });
  }

  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: "Logo image is required",
    });
  }

  const logo = `uploads/brands/${req.file.filename}`;

  const result = await createBrand({
    en: {
      name: enName,
      slug: slugify(enName, { lower: true })
    },
    ar: {
      name: arName,
      slug: slugify(arName, { lower: true })
    },
    logo
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

  console.log("BRAND BODY:", req.body);

  const enName = req.body?.en?.name || req.body?.enName;
  const arName = req.body?.ar?.name || req.body?.arName;

  let logo = undefined;
  if (req.file) {
    logo = `uploads/brands/${req.file.filename}`;
  }

  const en = enName
    ? { name: enName, slug: slugify(enName, { lower: true }) }
    : undefined;

  const ar = arName
    ? { name: arName, slug: slugify(arName, { lower: true }) }
    : undefined;

  const status = req.body?.status;
  const result = await updateBrand({
    id,
    en,
    ar,
    logo,
    status,
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

