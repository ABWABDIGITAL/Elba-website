// controllers/favorite.controller.js
import { toggleFavorite, getFavoriteProducts } from "../services/favorite.services.js";
import {paginate} from "../utlis/apiFeatures.js";
export const toggleFavoriteController = async (req, res, next) => {
  try {
    const userId = req.user._id; // from auth middleware
    const { sku } = req.params;

    const result = await toggleFavorite(userId, sku);

    return res.status(200).json({
      message: result.isFavorite ? "Added to favorites" : "Removed from favorites",
      ...result
    });

  } catch (err) {
    next(err);
  }
};

export const getUserFavoritesController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const products = await getFavoriteProducts(userId);

    return res.status(200).json({
      count: products.length,
      products
    });

  } catch (err) {
    next(err);
  }
};
