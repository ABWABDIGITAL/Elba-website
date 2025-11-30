// src/validators/home.validators.js
import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import validateSeo from "./seo.validators.js";

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const validateBanner = (field) => [
  body(`${field}.url`)
    .optional()
    .isString().withMessage(`${field}.url must be a string`)
    .notEmpty().withMessage(`${field}.url cannot be empty`),

  body(`${field}.alt.en`)
    .optional()
    .isString().withMessage(`${field}.alt.en must be a string`)
    .notEmpty().withMessage(`${field}.alt.en cannot be empty`),

  body(`${field}.alt.ar`)
    .optional()
    .isString().withMessage(`${field}.alt.ar must be a string`)
    .notEmpty().withMessage(`${field}.alt.ar cannot be empty`),
];


const validateProductRef = (field) => [
  body(`${field}`)
    .optional()
    .isArray().withMessage(`${field} must be an array`),

  body(`${field}.*.product`)
    .optional()
    .custom(async (val) => {
      if (!isValidObjectId(val)) throw new Error(`Invalid product ID: ${val}`);
      const exist = await Product.findById(val);
      if (!exist) throw new Error(`Product not found: ${val}`);
      return true;
    }),

  body(`${field}.*.order`)
    .optional()
    .isInt({ min: 0 })
    .withMessage(`${field}.*.order must be >= 0`),
];


const validateProductSection = (sectionName) => [
  ...validateProductRef(`${sectionName}.products`),

  body(`${sectionName}.viewAllLink`)
    .optional()
    .isString().withMessage(`${sectionName}.viewAllLink must be a string`),

  body(`${sectionName}.isActive`)
    .optional()
    .isBoolean().withMessage(`${sectionName}.isActive must be boolean`),
];
const validateCategoryShortcuts = [
  body("categoryShortcuts")
    .optional()
    .isArray().withMessage("categoryShortcuts must be an array"),

  body("categoryShortcuts.*.categories")
  .optional()
  .isArray().withMessage("categories must be an array"),

body("categoryShortcuts.*.categories.*")
  .optional()
  .custom(async (val) => {
    if (!isValidObjectId(val)) throw new Error(`Invalid Category ID: ${val}`);
    const exist = await Category.findById(val);
    if (!exist) throw new Error(`Category not found: ${val}`);
    return true;
  }),

];

const validateVideo = [
  body("promotionalVideo.url")
    .notEmpty().withMessage("promotionalVideo.url is required")
    .isString().withMessage("promotionalVideo.url must be string"),

  body("promotionalVideo.alt.en")
    .optional()
    .isString().withMessage("promotionalVideo.alt.en must be string"),

  body("promotionalVideo.alt.ar")
    .optional()
    .isString().withMessage("promotionalVideo.alt.ar must be string"),
];

const validateStoreLocator = [
  body("storeLocator.title.en")
    .optional()
    .isString().withMessage("storeLocator.title.en must be string"),

  body("storeLocator.title.ar")
    .optional()
    .isString().withMessage("storeLocator.title.ar must be string"),

  body("storeLocator.locations")
    .optional()
    .isArray().withMessage("storeLocator.locations must be an array"),

  body("storeLocator.locations.*.name.en")
    .optional()
    .isString().withMessage("storeLocator.locations.*.name.en must be string"),

  body("storeLocator.locations.*.name.ar")
    .optional()
    .isString().withMessage("storeLocator.locations.*.name.ar must be string"),

  body("storeLocator.locations.*.address.en")
    .optional()
    .isString().withMessage("storeLocator.locations.*.address.en must be string"),

  body("storeLocator.locations.*.address.ar")
    .optional()
    .isString().withMessage("storeLocator.locations.*.address.ar must be string"),

  body("storeLocator.locations.*.phone")
    .optional()
    .isString().withMessage("storeLocator.locations.*.phone must be string"),

  body("storeLocator.locations.*.coordinates.lat")
    .optional()
    .isFloat().withMessage("storeLocator.locations.*.coordinates.lat must be number"),

  body("storeLocator.locations.*.coordinates.lng")
    .optional()
    .isFloat().withMessage("storeLocator.locations.*.coordinates.lng must be number"),
];

// /* ----------------------------------------------------
//    FOOTER VALIDATOR
// ---------------------------------------------------- */
// const validateFooter = [
//   body("footer.about.en")
//     .optional()
//     .isString().withMessage("footer.about.en must be string"),

//   body("footer.about.ar")
//     .optional()
//     .isString().withMessage("footer.about.ar must be string"),

//   body("footer.socialMedia")
//     .optional()
//     .isArray().withMessage("footer.socialMedia must be array"),

//   body("footer.socialMedia.*.platform")
//     .optional()
//     .isString().withMessage("platform must be string"),

//   body("footer.socialMedia.*.url")
//     .optional()
//     .isString().withMessage("socialMedia.url must be string"),

//   body("footer.socialMedia.*.icon")
//     .optional()
//     .isString().withMessage("socialMedia.icon must be string"),

//   body("footer.paymentMethods")
//     .optional()
//     .isArray().withMessage("footer.paymentMethods must be array"),

//   body("footer.paymentMethods.*.name")
//     .optional()
//     .isString().withMessage("footer.paymentMethods.name must be string"),

//   body("footer.paymentMethods.*.icon")
//     .optional()
//     .isString().withMessage("footer.paymentMethods.icon must be string"),
// ];



export const validateUpdateHome = [
  /* HERO SLIDER */
  body("heroSlider")
    .optional()
    .isArray().withMessage("heroSlider must be an array"),
  ...validateBanner("heroSlider.*"),

  /* CATEGORY SHORTCUTS */
  ...validateCategoryShortcuts,

  /* PRODUCT SECTIONS */
  ...validateProductSection("bestOffers"),
  ...validateProductSection("bestSelling1"),
  ...validateProductSection("bestSelling2"),
  ...validateProductSection("bestSelling3"),
  ...validateProductSection("bestSelling4"),
  ...validateProductSection("bestSelling5"),

  /* PROMO BANNERS */
  ...validateBanner("promoBanner1"),
  ...validateBanner("promoBanner2"),

  /* VIDEO */
  ...validateVideo,

  /* STORE LOCATOR */
  // ...validateStoreLocator,

  /* FOOTER */
  // ...validateFooter,

  /* SEO */
  ...validateSeo,

  validatorMiddleware,
];
