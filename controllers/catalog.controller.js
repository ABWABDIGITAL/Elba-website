import {
  createCatalog,
  deleteCatalog,
  getAllCatalogs,
  getCatalogById,
  updateCatalog,
} from "../services/catalog.services.js";
import { StatusCodes } from "http-status-codes";

export const createCatalogController = async (req, res, next) => {
  try {
    const payload = {
      name: req.body.name,
      image: req.file ? `uploads/catalogs/${req.file.filename}` : null,
      type: req.body.type,
    };

    const catalog = await createCatalog(payload);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Catalog created successfully",
      data: catalog,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllCatalogsController = async (req, res, next) => {
  try {
    const catalogs = await getAllCatalogs();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Catalogs fetched successfully",
      data: catalogs,
    });
  } catch (err) {
    next(err);
  }
};

export const getCatalogByIdController = async (req, res, next) => {
  try {
    const catalog = await getCatalogById(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Catalog fetched successfully",
      data: catalog,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCatalogController = async (req, res, next) => {
  try {
    const payload = {
      id: req.params.id,
      name: req.body.name,
      image: req.file ? `uploads/catalogs/${req.file.filename}` : undefined,
      type: req.body.type,
    };

    const catalog = await updateCatalog(payload);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Catalog updated successfully",
      data: catalog,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCatalogController = async (req, res, next) => {
  try {
    const catalog = await deleteCatalog(req.params.id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Catalog deleted successfully",
      data: catalog,
    });
  } catch (err) {
    next(err);
  }
};
