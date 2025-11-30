import {
  createReviewService,
  getReviewService,
  updateReviewService,
  deleteReviewService,
  getReviewsService,
} from "../services/reviews.services.js";
import { StatusCodes } from "http-status-codes";

export const createReviewController = async (req, res, next) => {
  try {
    const { product, rating, title, comment } = req.body;

    const review = await createReviewService({
      product,
      rating,
      title,
      comment,
      user: req.user._id,
    });

    res.status(StatusCodes.CREATED).json({
      status: "success",
      message: "Review created successfully",
      data: review,
    });
  } catch (err) {
    next(err);
  }
};

export const getReviewController = async (req, res, next) => {
  try {
    const review = await getReviewService(req.params.id);

    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Review fetched successfully",
      data: review,
    });
  } catch (err) {
    next(err);
  }
};

export const getReviewsController = async (req, res, next) => {
  try {
    const result = await getReviewsService(req.query);

    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Reviews fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const updateReviewController = async (req, res, next) => {
  try {
    const { rating, title, comment } = req.body;

    const review = await updateReviewService({
      id: req.params.id,
      userId: req.user._id,
      userRole: req.user.role,
      rating,
      title,
      comment,
    });

    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Review updated successfully",
      data: review,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteReviewController = async (req, res, next) => {
  try {
    await deleteReviewService({
      id: req.params.id,
      userId: req.user._id,
      userRole: req.user.role,
    });

    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Review deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
