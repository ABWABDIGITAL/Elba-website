// src/validators/seo.validators.js
import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

const URL_PATTERN = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;

export const validateSeo = [

  /* ------------------ META TITLE ------------------ */
  body("seo.metaTitle")
    .optional()
    .isString().withMessage("metaTitle must be a string")
    .isLength({ max: 70 }).withMessage("metaTitle must be <= 70 characters"),

  /* ------------------ META DESCRIPTION ------------- */
  body("seo.metaDescription")
    .optional()
    .isString().withMessage("metaDescription must be a string")
    .isLength({ max: 160 }).withMessage("metaDescription must be <= 160 characters"),

  /* ------------------ CANONICAL URL ---------------- */
  body("seo.canonicalUrl")
    .optional()
    .matches(URL_PATTERN)
    .withMessage("canonicalUrl must be a valid URL"),

  /* ------------------ OPEN GRAPH ------------------- */
  body("seo.openGraph")
    .optional()
    .isObject().withMessage("openGraph must be an object"),

  body("seo.openGraph.title")
    .optional()
    .isString().withMessage("openGraph.title must be a string")
    .isLength({ max: 100 }).withMessage("openGraph.title must be <= 100 chars"),

  body("seo.openGraph.description")
    .optional()
    .isString().withMessage("openGraph.description must be a string")
    .isLength({ max: 200 }).withMessage("openGraph.description must be <= 200 chars"),

  body("seo.openGraph.image")
    .optional()
    .matches(URL_PATTERN)
    .withMessage("openGraph.image must be a valid URL"),

  body("seo.openGraph.type")
    .optional()
    .isString().withMessage("openGraph.type must be a string"),

  /* ------------------ TWITTER ---------------------- */
  body("seo.twitter")
    .optional()
    .isObject().withMessage("twitter must be an object"),

  body("seo.twitter.title")
    .optional()
    .isString().withMessage("twitter.title must be a string")
    .isLength({ max: 100 }),

  body("seo.twitter.description")
    .optional()
    .isString().withMessage("twitter.description must be a string")
    .isLength({ max: 200 }),

  body("seo.twitter.image")
    .optional()
    .matches(URL_PATTERN)
    .withMessage("twitter.image must be a valid URL"),

  body("seo.twitter.card")
    .optional()
    .isString().withMessage("twitter.card must be a string"),

  /* ------------------ ROBOTS ----------------------- */
  body("seo.robots")
    .optional()
    .isObject().withMessage("robots must be an object"),

  body("seo.robots.noindex")
    .optional()
    .isBoolean().withMessage("robots.noindex must be boolean"),

  body("seo.robots.nofollow")
    .optional()
    .isBoolean().withMessage("robots.nofollow must be boolean"),

  body("seo.robots.noimageindex")
    .optional()
    .isBoolean().withMessage("robots.noimageindex must be boolean"),

  /* ------------------ KEYWORDS --------------------- */
  body("seo.keywords")
    .optional()
    .isArray().withMessage("keywords must be an array of strings"),

  body("seo.keywords.*")
    .optional()
    .isString().withMessage("Each keyword must be a string"),

  /* ------------------ STRUCTURED DATA -------------- */
  body("seo.structuredData")
    .optional()
    .isObject().withMessage("structuredData must be an object"),

  validatorMiddleware,
];

export default validateSeo;