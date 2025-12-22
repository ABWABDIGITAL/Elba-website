import multer from "multer";
import path from "path";
import fs from "fs";

// ================================
// MIME & EXTENSION WHITELISTS
// ================================

// Images
export const IMG_MIME = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const IMG_EXT = [
  ".jpeg",
  ".png",
  ".jpg",
  ".webp",
  ".gif",
  ".svg",
];

// Videos
const VIDEO_MIME = ["video/mp4"];
const VIDEO_EXT = [".mp4"];

// catalogs (PDF + DOC + Images)
const REF_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ...IMG_MIME,
];

const REF_EXT = [
  ".pdf",
  ".doc",
  ".docx",
  ...IMG_EXT,
];

// ================================
// HELPERS
// ================================
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const baseUpload = ({
  folder,
  allowedMime = IMG_MIME,
  allowedExt = IMG_EXT,
  maxSizeMB = 20,
}) => {

  if (!folder) throw new Error("Upload middleware requires a folder name");

  const dir = `uploads/${folder}`;
  ensureDir(dir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${unique}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error(`Invalid mime type: ${file.mimetype}`), false);
    }
    if (!allowedExt.includes(ext)) {
      return cb(new Error(`Invalid file extension: ${ext}`), false);
    }
    cb(null, true);
  };

  return multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 }, // MB limit
    fileFilter,
  });
};

// ================================
// EXPORT 1: IMAGE + VIDEO UPLOADER (HOME PAGE)
// ================================
export const imageUpload = (folder = "home") => {
  return baseUpload({
    folder,
    allowedMime: [...IMG_MIME, ...VIDEO_MIME],
    allowedExt: [...IMG_EXT, ...VIDEO_EXT],
    maxSizeMB: 50, // allow large MP4 files
  });
};

// ================================
// EXPORT 2: PRODUCT MEDIA UPLOADER
// ================================
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;

    if (file.fieldname === "images") {
      dir = "uploads/products/images";
    } else if (file.fieldname === "catalog") {
      dir = "uploads/products/catalog";
    } else {
      dir = "uploads/misc";
    }

    ensureDir(dir);
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${name}${ext}`);
  },
});

const productFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  let allowedMime = [];
  let allowedExt = [];

  if (file.fieldname === "images") {
    allowedMime = [...IMG_MIME];
    allowedExt = [...IMG_EXT];
  } 
  else if (file.fieldname === "catalog") {
    allowedMime = [...REF_MIME];
    allowedExt = [...REF_EXT];
  } 
  else {
    return cb(new Error(`Unexpected field: ${file.fieldname}`), false);
  }

  if (!allowedMime.includes(file.mimetype)) {
    return cb(new Error(`Invalid mime for ${file.fieldname}: ${file.mimetype}`), false);
  }

  if (!allowedExt.includes(ext)) {
    return cb(new Error(`Invalid extension for ${file.fieldname}: ${ext}`), false);
  }

  cb(null, true);
};


export const productMediaUpload = multer({
  storage: productStorage,
  fileFilter: productFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
});
export const homeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = "uploads/home";
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${unique}${ext}`);
    }
  }),

  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  }
}).any(); // <-- THIS FIXES bannerseller[0][url]

// ================================
// DEFAULT EXPORT (generic)
// ================================
export default baseUpload;
export const blogUpload = () => {
  return baseUpload({
    folder: "blogs",
    allowedMime: IMG_MIME,
    allowedExt: IMG_EXT,
    maxSizeMB: 5,
  });
};
