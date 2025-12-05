// utils/recalcCategoryProductCounts.js
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

export async function recalcCategoryProductCounts() {
  // 1) group products by category
  const grouped = await Product.aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
  ]);

  // 2) reset all to 0 first (important so empty categories are correct)
  await Category.updateMany({}, { $set: { productCount: 0 } });

  if (!grouped.length) return;

  // 3) apply counts
  const bulkOps = grouped.map((item) => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $set: { productCount: item.count } },
    },
  }));

  await Category.bulkWrite(bulkOps);

  console.log("✅ Recalculated productCount for categories");
}
