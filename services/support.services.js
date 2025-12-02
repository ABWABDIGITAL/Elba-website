import Support from "../models/support.model.js";

export const createSupportRequest = async (data, userId) => {
  const support = await Support.create({
    ...data,
    createdBy: userId,
  });

  return support;
};

export const getUserSupportRequests = async (userId) => {
  return await Support.find({ createdBy: userId }).sort({ createdAt: -1 });
};

export const getAllSupportRequests = async () => {
  return await Support.find().sort({ createdAt: -1 });
};
