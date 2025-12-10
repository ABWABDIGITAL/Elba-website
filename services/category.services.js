import Category from "../models/category.model.js";
import path from "path";
import fs from "fs";

export const createCategory = async ({ ar, en, image, sizeType, status }) => {
  try {

    const exists = await Category.findOne({
      $or: [
        { "ar.name": ar.name },
        { "en.name": en.name }
      ]
    });

    if (exists) {
      return {
        OK: false,
        error: "Category already exists in Arabic or English"
      };
    }

    // Create new category
    const category = await Category.create({
      ar,
      en,
      image,
      sizeType,
      status
    });

    return { OK: true, data: category };

  } catch (err) {
    console.log(err);
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


export const updateCategory = async ({ id, ar, en, sizeType, image, status }) => {
  try {
    const category = await Category.findById(id);
    console.log(id);
    console.log(category);
    if (!category) return { OK: false, error: "Category not found" };

    if (category.image) {
      const oldPath = path.join(process.cwd(), category.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    if (ar) category.ar = { ...category.ar, ...ar };
    if (en) category.en = { ...category.en, ...en };
    if (sizeType) category.sizeType = sizeType;
    if (image) category.image = image;
    if (status) category.status = status;
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
export const getLargeSmallCount = async () => {
  const categories = await Category.find().lean();

  const largeTotal = categories
    .filter((c) => c.sizeType === "Large")
    .reduce((sum, c) => sum + (c.productCount || 0), 0);

  const smallTotal = categories
    .filter((c) => c.sizeType === "Small")
    .reduce((sum, c) => sum + (c.productCount || 0), 0);

  return { large: largeTotal, small: smallTotal };
};
