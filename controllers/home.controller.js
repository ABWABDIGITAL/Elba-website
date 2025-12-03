// controllers/home.controller.js
import {
  createHomeService,
  updateHomeService,
  getHomeService,
} from "../services/home.services.js";

/* ============================================================
   CREATE HOME
============================================================ */
export const createHome = async (req, res) => {
  try {
    const payload = buildHomePayload(req);

    const home = await createHomeService(payload);

    return res.status(201).json({
      status: "success",
      data: home,
    });
  } catch (err) {
    return sendDebugError(err, req, res);
  }
};

/* ============================================================
   UPDATE HOME
============================================================ */
export const updateHome = async (req, res) => {
  try {
    const payload = buildHomePayload(req);

    const home = await updateHomeService(payload);

    return res.json({
      status: "success",
      data: home,
    });
  } catch (err) {
    return sendDebugError(err, req, res);
  }
};

/* ============================================================
   GET HOME
============================================================ */
export const getHome = async (req, res) => {
  const result = await getHomeService();
  res.json(result);
};

/* ============================================================
   COMMON DEBUG HANDLER
============================================================ */
function sendDebugError(err, req, res) {
  console.error("DEBUG ERROR:", err);

  return res.status(500).json({
    status: "error",
    message: "DEBUG MODE ERROR",
    raw: err,
    stack: err.stack,
    body: req.body,
    files: req.files,
  });
}

/* ============================================================
   SAFE JSON PARSER
============================================================ */
function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/* ============================================================
   BUILD PAYLOAD (MAIN LOGIC)
============================================================ */
function buildHomePayload(req) {
  const body = req.body;
  const files = Array.isArray(req.files) ? req.files : [];

  const payload = {};

  /* ----------------------------------------------------------
       1) EXTRACT SIMPLE ARRAY FIELDS WITH FILES
  ----------------------------------------------------------- */
  const extractArray = (fieldname) =>
    files
      .filter((f) => f.fieldname === fieldname)
      .map((f) => ({ url: `/uploads/home/${f.filename}` }));

  payload.heroSlider = extractArray("heroSlider");
  payload.banner1 = extractArray("banner1");
  payload.promoVideo = extractArray("promoVideo");
  payload.popVideo = extractArray("popVideo");
  payload.gif = extractArray("gif");

  /* ----------------------------------------------------------
       2) PARSE JSON FIELDS (PRODUCTS, CATEGORIES, etc)
  ----------------------------------------------------------- */
  payload.products = safeJsonParse(body.products);
  payload.bestOffer = safeJsonParse(body.bestOffer);
  payload.categories = safeJsonParse(body.categories);
  payload.braches = safeJsonParse(body.braches);
  payload.seo = safeJsonParse(body.seo);

  /* ----------------------------------------------------------
       3) bannerseller[n] (NESTED MIXED FIELDS)
       supports dynamic fieldnames: bannerseller[0][url]
  ----------------------------------------------------------- */
  const bannerseller = [];

  // A) extract uploaded images for each index
  files.forEach((file) => {
    const match = file.fieldname.match(/bannerseller\[(\d+)\]\[url\]/);
    if (match) {
      const index = Number(match[1]);
      if (!bannerseller[index]) bannerseller[index] = {};

      bannerseller[index].url = `/uploads/home/${file.filename}`;
    }
  });

  // B) extract discount + discountCollection text fields
  Object.keys(body).forEach((key) => {
    const match = key.match(/bannerseller\[(\d+)\]\[(\w+)\]/);
    if (match) {
      const index = Number(match[1]);
      const field = match[2];

      if (!bannerseller[index]) bannerseller[index] = {};

      if (field === "discount") {
        bannerseller[index].discount = Number(body[key]);
      }

      if (field === "discountCollection") {
        bannerseller[index].discountCollection = String(body[key]).trim();
      }
    }
  });

  payload.bannerseller = bannerseller;

  return payload;
}

export default {
  createHome,
  updateHome,
  getHome,
};
