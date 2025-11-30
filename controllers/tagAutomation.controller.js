import {
  autoAssignTagsService,
  cleanupExpiredTagsService,
  getTagAutomationRulesService,
  updateTagAutomationRulesService,
  previewTagAssignmentService,
} from "../services/tagAutomation.services.js";
import { StatusCodes } from "http-status-codes";

/* --------------------------------------------------
   RUN TAG AUTOMATION
--------------------------------------------------- */
export const runTagAutomation = async (req, res, next) => {
  try {
    const { dryRun, tags, productIds } = req.body;

    const result = await autoAssignTagsService({
      dryRun: dryRun === true || dryRun === "true",
      tags: tags || undefined,
      productIds: productIds || null,
    });

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   CLEANUP EXPIRED TAGS
--------------------------------------------------- */
export const cleanupExpiredTags = async (req, res, next) => {
  try {
    const result = await cleanupExpiredTagsService();
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET TAG AUTOMATION RULES
--------------------------------------------------- */
export const getTagAutomationRules = async (req, res, next) => {
  try {
    const result = getTagAutomationRulesService();
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   UPDATE TAG AUTOMATION RULE
--------------------------------------------------- */
export const updateTagAutomationRule = async (req, res, next) => {
  try {
    const { tag } = req.params;
    const updates = req.body;

    const result = updateTagAutomationRulesService(tag, updates);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   PREVIEW TAG ASSIGNMENT FOR PRODUCT
--------------------------------------------------- */
export const previewTagAssignment = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const result = await previewTagAssignmentService(productId);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};
