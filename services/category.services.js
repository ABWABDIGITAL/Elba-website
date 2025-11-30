import Category from "../models/category.model.js";
import path from "path";
import fs from "fs";

export const createCategory = async ({ ar, en, image, type }) => {
  try {
    const category = await Category.create({
      ar,
      en,
      image,
      type
    });

    return { OK: true, data: category };

  } catch (err) {
    return { OK: false, error: "Server error" };
  }
};


export const getCategories = async () => {
  try {
    const categories = await Category.find({});
    return { OK: true, data: categories };
  } catch {
    return { OK: false, error: "Server error" };
  }
};


export const getCategory = async ({ id }) => {
  try {
    const category = await Category.findById(id);
    if (!category) return { OK: false, error: "Category not found" };
    return { OK: true, data: category };
  } catch {
    return { OK: false, error: "Invalid ID format" };
  }
};


export const updateCategory = async ({ id, ar, en, type, image }) => {
  try {
    const category = await Category.findById(id);
    if (!category) return { OK: false, error: "Category not found" };

    if (category.image) {
      const oldPath = path.join(process.cwd(), category.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    if (ar) category.ar = { ...category.ar, ...ar };
    if (en) category.en = { ...category.en, ...en };
    if (type) category.type = type;
    if (image) category.image = image;

    await category.save();

    return { OK: true, data: category };

  } catch {
    return { OK: false, error: "Server error" };
  }
};


export const deleteCategory = async ({ id }) => {
  try {
    const category = await Category.findById(id);
    if (!category) return { OK: false, error: "Category not found" };

    if (category.image) {
      const imagePath = path.join(process.cwd(), category.image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await Category.findByIdAndDelete(id);

    return { OK: true, data: category };

  } catch {
    return { OK: false, error: "Server error" };
  }
};
