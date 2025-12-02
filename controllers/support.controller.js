import {
  createSupportRequest,
  getUserSupportRequests,
  getAllSupportRequests,
} from "../services/support.services.js";

export const createSupportController = async (req, res, next) => {
  try {
    const support = await createSupportRequest(req.body, req.user._id);

    return res.status(201).json({
      message: "Support request submitted",
      support,
    });
  } catch (err) {
    next(err);
  }
};

export const getMySupportRequestsController = async (req, res, next) => {
  try {
    const supports = await getUserSupportRequests(req.user._id);

    return res.status(200).json({
      count: supports.length,
      supports,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllSupportRequestsController = async (req, res, next) => {
  try {
    const supports = await getAllSupportRequests();

    return res.status(200).json({
      count: supports.length,
      supports,
    });
  } catch (err) {
    next(err);
  }
};
