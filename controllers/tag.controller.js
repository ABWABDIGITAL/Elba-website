import {
  createTagService,
  getAllTagsService,
  getTagByIdService,
  updateTagService,
  deleteTagService,
} from "../services/tag.services.js";
import { StatusCodes } from "http-status-codes";

/* --------------------------------------------------
   CREATE TAG
--------------------------------------------------- */
export const createTag = async (req, res, next) => {
  try {
    const result = await createTagService(req.body);
    res.status(StatusCodes.CREATED).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET ALL TAGS
--------------------------------------------------- */
export const getAllTags = async (req, res, next) => {
  try {
    const result = await getAllTagsService(req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET TAG BY ID
--------------------------------------------------- */
export const getTagById = async (req, res, next) => {
  try {
    const result = await getTagByIdService(req.params.id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   UPDATE TAG
--------------------------------------------------- */
export const updateTag = async (req, res, next) => {
  try {
    const result = await updateTagService(req.params.id, req.body);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   DELETE TAG
--------------------------------------------------- */
export const deleteTag = async (req, res, next) => {
  try {
    const result = await deleteTagService(req.params.id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};
