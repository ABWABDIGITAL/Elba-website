export const parseJson = (req, res, next) => {
  // Fields that always need JSON parsing
  const jsonFields = [
    "features",
    "specifications",
    "compareAttributes",
    "seo" // NEW!
  ];

  jsonFields.forEach((field) => {
    const rawValue = req.body[field];

    if (!rawValue) return;

    try {
      // Case 1: Value is a JSON string → parse it
      if (typeof rawValue === "string") {
        req.body[field] = JSON.parse(rawValue);
        return;
      }

      // Case 2: Array of JSON strings (Postman can send arrays as ["{...}"])
      if (Array.isArray(rawValue)) {
        req.body[field] = rawValue.map((item) => {
          if (typeof item === "string") {
            try {
              return JSON.parse(item);
            } catch {
              return item; // keep raw if it’s not JSON
            }
          }
          return item;
        });

        // Flatten nested: [[{...}]] → [{...}]
        if (req.body[field].length === 1 && Array.isArray(req.body[field][0])) {
          req.body[field] = req.body[field][0];
        }
      }
    } catch (err) {
      // JSON parsing failed → keep original and allow validator to handle it
      console.warn(`Invalid JSON for field "${field}"`);
    }
  });

  next();
};

export default parseJson;
