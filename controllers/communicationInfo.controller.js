import * as communicationService from "../services/communicationInfo.services.js";

export const createCommunicationInfoController = async (req, res, next) => {
  try {
    const info = await communicationService.createCommunicationInfo(
      req.body,
      req.user._id
    );

    res.status(201).json({
      message: "Communication info submitted successfully",
      info
    });

  } catch (err) {
    next(err);
  }
};

export const getMyCommunicationInfoController = async (req, res, next) => {
  try {
    const infoList = await communicationService.getMyCommunicationInfo(
      req.user._id
    );

    res.status(200).json({
      count: infoList.length,
      infoList,
    });

  } catch (err) {
    next(err);
  }
};
