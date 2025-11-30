// middlewares/uploadMiddleware.js
import multer from "multer";
import path from "path";
import fs from "fs";

// Image types
const IMG_MIME = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const IMG_EXT = [".jpeg", ".png", ".jpg", ".webp"];

// Reference types (PDF, DOC, IMG)
const REF_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const REF_EXT = [".pdf", ".doc", ".docx", ".jpeg", ".jpg", ".png"];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// لو محتاج ال generic القديم:
const baseUpload = ({
  folder,
  allowedMime = IMG_MIME,
  allowedExt = IMG_EXT,
  maxSizeMB = 5,
}) => {
  if (!folder) throw new Error("Upload middleware requires a folder name");

  const dir = `uploads/${folder}`;
  ensureDir(dir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${name}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const mimetype = file.mimetype;
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMime.includes(mimetype)) {
      return cb(new Error(`Invalid file type: ${mimetype}`), false);
    }
    if (!allowedExt.includes(ext)) {
      return cb(new Error(`Invalid file extension: ${ext}`), false);
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
  });
};

// لو محتاجهم لخدمات تانية
export const imageUpload = (folder) =>
  baseUpload({ folder, allowedMime: IMG_MIME, allowedExt: IMG_EXT, maxSizeMB: 5 });

export const referenceUpload = (folder = "products/reference") =>
  baseUpload({
    folder,
    allowedMime: REF_MIME,
    allowedExt: REF_EXT,
    maxSizeMB: 10,
  });

// ====== المهم للـ Product: productMediaUpload ======
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;
    if (file.fieldname === "images") {
      dir = "uploads/products/images";
    } else if (file.fieldname === "reference") {
      dir = "uploads/products/reference";
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
  const mimetype = file.mimetype;
  const ext = path.extname(file.originalname).toLowerCase();

  let allowedMime = [];
  let allowedExt = [];

  if (file.fieldname === "images") {
    allowedMime = IMG_MIME;
    allowedExt = IMG_EXT;
  } else if (file.fieldname === "reference") {
    allowedMime = REF_MIME;
    allowedExt = REF_EXT;
  } else {
    return cb(new Error(`Unexpected field: ${file.fieldname}`), false);
  }

  if (!allowedMime.includes(mimetype)) {
    return cb(new Error(`Invalid file type for ${file.fieldname}: ${mimetype}`), false);
  }
  if (!allowedExt.includes(ext)) {
    return cb(
      new Error(`Invalid file extension for ${file.fieldname}: ${ext}`),
      false
    );
  }

  cb(null, true);
};

export const productMediaUpload = multer({
  storage: productStorage,
  fileFilter: productFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

// default export لو حد بيستخدمه
export default baseUpload;
