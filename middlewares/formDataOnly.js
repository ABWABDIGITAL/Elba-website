import multer from "multer";

// Accept form-data with NO files (text only)
const formDataOnly = multer().none();

export default formDataOnly;
