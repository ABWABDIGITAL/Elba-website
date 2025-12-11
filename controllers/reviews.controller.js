import {
  createReviewService,
  getReviewService,
  updateReviewService,
  deleteReviewService,
  getReviewsService,
  toggleReviewActiveService,
} from "../services/reviews.services.js";
import { StatusCodes } from "http-status-codes";
import { NotFound } from "../utlis/apiError.js";
import Review from "../models/review.model.js"
export const createReviewController = async (req, res, next) => {
  try {
    const { product, rating, title, comment ,email ,name} = req.body;

    const review = await createReviewService({
      product,
      rating,
      title,
      comment,
      name,
      email,
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
    const review = await getReviewService(req.params.slug);

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
    const review = await Review.findById(req.params.id);
    if(!review){
      throw NotFound("Review not found")
    }
    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Review deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const toggleReviewActiveController = async (req,res,next)=>{
  try {
   await toggleReviewActiveService({
    id: req.params.id,
    userRole: req.user.role?.name,
   }) 
   console.log(req.user.role)
   const review = await Review.findById(req.params.id);
   if(!review){
    throw NotFound("Review not found")
   }
   res.status(StatusCodes.OK).json({
    status: "success",
    message: "Review active status toggled successfully",
   })
  } catch (error) {
    next(error)
  }
}