// controllers/home.controller.js
import Home from "../models/home.model.js";
import {
  createHomeService,
  getHomeService,
  updateHomeService,
} from "../services/home.services.js";
import { NotFound, ServerError } from "../utlis/apiError.js";


function buildBannerArray(req, fieldName) {
  if (!req.files?.[fieldName]) return undefined;

  return req.files[fieldName].map((file, index) => ({
    imageUrl: `/uploads/home/${file.filename}`,
    redirectUrl: req.body[`${fieldName}[${index}][redirectUrl]`] || null,
    sortOrder: req.body[`${fieldName}[${index}][sortOrder]`] || index,
    isActive: true
  }));
}

export const createHome = async (req, res, next) => {
  try {
    const result = await createHomeService(req.body);
    res.status(201).json({ OK: true, message: "Created", data: result });
  } catch (err) {
    next(err);
  }
};

/* -----------------------------------------
   GET HOME
------------------------------------------ */
export const getHome = async (req, res, next) => {
  try {
    const result = await getHomeService();
    res.json({
      OK: true,
      msg:"Home page fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* -----------------------------------------
   UPDATE HOME
------------------------------------------ */
export const updateHome = async (req, res, next) => {
  try {
    const payload = { ...req.body };
        

    // Build banner arrays for all fields
    const bannerFields = ["hero", "gif", "promovideo", "popupVideo"];

    for (const field of bannerFields) {
      const bannerArray = buildBannerArray(req, field);
      if (bannerArray) payload[field] = bannerArray;
    }

  if (req.files?.offerBanner) {
    payload.offerBanner = req.files.offerBanner.map((file, index) => ({
      url: `/uploads/home/${file.filename}`,
      discount: Number(req.body.discount?.[index]),
      discountTitle: req.body.discountTitle?.[index]
    }));
  }


    // Update home
    const result = await updateHomeService(payload);
    res.json({ OK: true, msg: "Home page updated successfully", data: result });

  } catch (err) {
    next(err);
  }
};

export const uploadHomeBanners = async (req, res, next) => {
  try {
    let config = await Home.findOne();
    if (!config) throw NotFound("HomeConfig not created yet");

    const toBanner = (files) =>
      files.map((f, idx) => ({
        imageUrl: `/uploads/home/${f.filename}`,
        sortOrder: idx,
        isActive: true,
      }));

    if (req.files.hero) config.hero = toBanner(req.files.hero);
    if (req.files.gif) config.gif = toBanner(req.files.gif);
    if (req.files.promovideo) config.promovideo = toBanner(req.files.promovideo);
    if (req.files.popupVideo) config.popupVideo = toBanner(req.files.popupVideo);

    // OFFER BANNER (files + metadata)
    if (req.files.offerBanner) {
      const discounts = req.body.discount || [];
      const titles = req.body.discountTitle || [];

      config.offerBanner = req.files.offerBanner.map((file, idx) => ({
        url: `/uploads/home/${file.filename}`,
        discount: Number(discounts[idx] || 0),
        discountTitle: titles[idx] || "",
      }));
    }

    await config.save();
    await Home.updateCategoryTotals();

    res.json({ OK: true, msg:"Banners updated successfully", data: config });
  } catch (err) {
    next(ServerError("Failed to upload banners", err));
  }
};

