import ContactUs from "../models/contactUs.model.js";

export const createContactMessage = async (data) => {
  const entry = await ContactUs.create(data);
  return entry;
};

export const getAllMessages = async () => {
  return await ContactUs.find().sort({ createdAt: -1 });
};
