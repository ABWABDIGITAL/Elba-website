/**
 * Convert a relative file path to an absolute URL using BASE_URL.
 * If the path is already absolute (starts with "http"), return as-is.
 * If the path is falsy, return it unchanged.
 *
 * @param {string} filePath - e.g. "/uploads/products/images/123.jpg"
 * @returns {string} - e.g. "https://elba.abwabdigital.com/uploads/products/images/123.jpg"
 */
export const toAbsoluteUrl = (filePath) => {
  if (!filePath) return filePath;
  if (filePath.startsWith("http")) return filePath;
  const base = process.env.BASE_URL || "";
  return `${base}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
};
