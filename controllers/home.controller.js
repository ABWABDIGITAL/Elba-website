import {
  createHomeService,
  getHomeService,
  updateHomeService,
} from "../services/home.services.js";

export const createHome = async (req, res, next) => {
  try {
    const data = await createHomeService(req.body);

    res.status(201).json({
      status: "success",
      message: "Home page created successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getHome = async (req, res, next) => {
  try {
    const result = await getHomeService();

    res.status(200).json({
      status: "success",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateHome = async (req, res, next) => {
  try {
    const updated = await updateHomeService(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      message: "Home page updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
