// services/favorite.service.js
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import { NotFound } from "../utlis/apiError.js";
import { buildGetAllproductDTO } from "./product.services.js";

export const toggleFavorite = async (userId, sku) => {
  const product = await Product.findOne({ sku: sku.toUpperCase() }).select("_id sku");

  if (!product) {
    throw NotFound("Product not found");
  }

  const user = await User.findById(userId).select("favorites");
  if (!user) throw NotFound("User not found");

  const productId = product._id.toString();
  const index = user.favorites.findIndex(id => id.toString() === productId);

  let isFavorite;

  if (index === -1) {
    user.favorites.push(product._id);
    isFavorite = true;
  } else {
    user.favorites.splice(index, 1);
    isFavorite = false;
  }

  await user.save();

  return { sku: product.sku, isFavorite };
};

export const getFavoriteProducts = async (userId) => {
  const user = await User.findById(userId).populate({
    path: "favorites",
    model: "Product",
    populate: [
      { path: "category", select: "ar.name ar.slug en.name en.slug image" },
      { path: "brand", select: "ar.name ar.slug en.name en.slug logo" }
    ]
  });

  if (!user) throw NotFound("User not found");

  return user.favorites.map(buildGetAllproductDTO);
};
