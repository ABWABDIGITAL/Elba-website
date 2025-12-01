import {
  createBranchService,
  getBranchService,
  updateBranchService,
  deleteBranchService,
  getBranchesService,
} from "../services/branches.services.js";

export const createBranch = async (req, res, next) => {
  try {
    const branch = await createBranchService(req.body);

    res.status(201).json({
      status: "success",
      message: "Branch created successfully",
      data: branch,
    });
  } catch (err) {
    next(err);
  }
};

export const getBranch = async (req, res, next) => {
  try {
    const { language = "ar" } = req.query;
    const branch = await getBranchService(req.params.id, language);

    res.json({
      status: "success",
      message: "Branch fetched successfully",
      data: branch,
    });
  } catch (err) {
    next(err);
  }
};

export const getBranches = async (req, res, next) => {
  try {
    const result = await getBranchesService(req.query);

    res.json({
      status: "success",
      message: "Branches fetched successfully",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const branch = await updateBranchService({
      id: req.params.id,
      data: req.body,
    });

    res.json({
      status: "success",
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const branch = await deleteBranchService(req.params.id);

    res.json({
      status: "success",
      message: "Branch deleted successfully",
      data: branch,
    });
  } catch (err) {
    next(err);
  }
};
