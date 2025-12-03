import EmailPoster from "../models/emailPoster.model.js";

export const createEmailPosterService = async (payload) => {
  const emailPoster = await EmailPoster.create(payload);
  return emailPoster;
};

export const getAllEmailPostersService = async () => {
  const emailPosters = await EmailPoster.find();
  return emailPosters;
};

