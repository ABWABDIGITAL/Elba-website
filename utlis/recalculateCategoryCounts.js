// utils/recalculateCategoryCounts.js
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

export const recalcCategoryCounts = async () => {
  const categories = await Category.find();

  for (const cat of categories) {
    const count = await Product.countDocuments({ category: cat._id });
    cat.productCount = count;
    await cat.save();
  }

  console.log("Category product counts recalculated successfully");
};
