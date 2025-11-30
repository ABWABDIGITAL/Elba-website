import Category from "../models/category.model.js";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import ApiError, {
  BadRequest,
  Forbidden,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";
export const createCategory = async ({ name, image , catalog }) => {
  try {
    if (!name || !image || !catalog) {
      return { OK: false, error: "Name , image and catalog are required" };
    }

    const exists = await Category.findOne({ name });
    if (exists) {
      throw BadRequest("category already exit")
    }

    const category = await Category.create({
      name,
      slug: slugify(name),
      image,
      catalog,
    });

    return { OK: true, data: category };
  } catch (err) {
    return { OK: false, error: "Server error" };
  }
};


export const getCategories = async () => {
  try {
    const categories = await Category.find({}).populate({
      path: "catalog",
      select: "name slug productCount"
    });
    return { OK: true, data: categories };
  } catch (err) {
    return { OK: false, error: "Server error" };
  }
};


export const getCategory = async ({ id }) => {
  try {
    if (!id) return { OK: false, error: "ID is required" };

    const category = await Category.findById(id).populate({
      path: "catalog",
      select: "name slug"
    });
    if (!category) return { OK: false, error: "Category not found" };

    return { OK: true, data: category };
  } catch (err) {
    return { OK: false, error: "Invalid ID format" };
  }
};

export const updateCategory = async ({ id, name, image , catalog}) => {
  try {
    if (!id) return { OK: false, error: "ID is required" };
    if (!name || !image) return { OK: false, error: "Name and image are required" };

    const category = await Category.findById(id);
    if (!category) return { OK: false, error: "Category not found" };

    if (category.image) {
      const oldPath = path.join(process.cwd(), category.image);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    category.name = name;
    category.slug = slugify(name, { lower: true });
    category.image = image;
    category.catalog = catalog;
    await category.save();

    return { OK: true, data: category };
  } catch (err) {
    return { OK: false, error: "Server error" };
  }
};



export const deleteCategory = async ({ id }) => {
  try {
    if (!id) return { OK: false, error: "ID is required" };

    const category = await Category.findById(id);
    if (!category) return { OK: false, error: "Category not found" };

    if (category.image) {
      const imagePath = path.join(process.cwd(), category.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Category.findByIdAndDelete(id);

    return { OK: true, data: category };
  } catch (err) {
    return { OK: false, error: "Server error" };
  }
};

