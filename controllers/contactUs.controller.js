import * as contactService from "../services/contactUs.services.js";

export const createContactController = async (req, res, next) => {
  try {
    const contact = await contactService.createContactMessage(req.body);

    res.status(201).json({
      message: "Message sent successfully",
      contact
    });

  } catch (err) {
    next(err);
  }
};

export const getAllContactMessagesController = async (req, res, next) => {
  try {
    const messages = await contactService.getAllMessages();

    res.status(200).json({
      count: messages.length,
      messages,
    });

  } catch (err) {
    next(err);
  }
};
