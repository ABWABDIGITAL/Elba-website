import Catalog from "../models/catalog.model.js";
import slugify from "slugify";
import {
  BadRequest,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
export const createCatalog = async ({ name, image ,type}) => {
  if (!name || !image) {
    throw BadRequest("Name and image are required");
  }

  const exists = await Catalog.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });
  if (exists) {
    throw BadRequest("Catalog already exists");
  }

  try {
    const catalog = await Catalog.create({
      name,
      slug: slugify(name, { lower: true }),
      image,
      type,
    });

    return catalog;
  } catch (err) {
    throw ServerError("Failed to create catalog", err);
  }
};

export const updateCatalog = async ({ id, name, image , type}) => {
  const catalog = await Catalog.findById(id);
  if (!catalog) {
    throw NotFound("Catalog not found");
  }

  if (name) {
    const slug = slugify(name, { lower: true });

    const exists = await Catalog.findOne({
      slug,
      _id: { $ne: id },
    });
    if (exists) {
      throw BadRequest("Another catalog with same name already exists");
    }

    catalog.name = name;
    catalog.slug = slug;
    catalog.type = type;
  }

  if (image) {
    catalog.image = image;
  }

  try {
    await catalog.save();
    return catalog;
  } catch (err) {
    throw ServerError("Failed to update catalog", err);
  }
};

export const deleteCatalog = async (id) => {
  const catalog = await Catalog.findById(id);
  if (!catalog) {
    throw NotFound("Catalog not found");
  }

  // TODO: prevent deletion if categories exist under this catalog

  try {
    await Catalog.findByIdAndDelete(id);
    return catalog;
  } catch (err) {
    throw ServerError("Failed to delete catalog", err);
  }
};

export const getAllCatalogs = async () => {
  try {
    const catalogs = await Catalog.find();
    return catalogs;
  } catch (err) {
    throw ServerError("Failed to get catalogs", err);
  }
};

export const getCatalogById = async (id) => {
  try {
    const catalog = await Catalog.findById(id);
    if (!catalog) {
      throw NotFound("Catalog not found");
    }
    return catalog;
  } catch (err) {
    throw BadRequest("Invalid catalog ID");
  }
};