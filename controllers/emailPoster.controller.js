import {
  createEmailPosterService,
  getAllEmailPostersService,
} from "../services/emailPoster.services.js";

export const createEmailPosterController = async (req, res) => {
  try {
    const payload = req.body;
    const emailPoster = await createEmailPosterService(payload);
    res.status(201).json({ status: "success", msg:"Email poster created successfully",data: emailPoster });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      status: "error",
      message: "Failed to create email poster",
      details: err,
    });
  }
};
export const getEmailPostersController = async (req, res) => {
  try {
    const emailPosters = await getAllEmailPostersService();
    res.status(200).json({ status: "success", msg:"Email posters retrieved successfully", data: emailPosters });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      status: "error",
      message: "Failed to get email posters",
      details: err,
    });
  }
};