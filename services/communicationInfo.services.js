import CommunicationInfo from "../models/communicationInfo.model.js";

export const createCommunicationInfo = async (data, userId) => {
  return await CommunicationInfo.create({
    ...data,
    createdBy: userId
  });
};

export const getMyCommunicationInfo = async (userId) => {
  return await CommunicationInfo.find({ createdBy: userId })
    .sort({ createdAt: -1 });
};
