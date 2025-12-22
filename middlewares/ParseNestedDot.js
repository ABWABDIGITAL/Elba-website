import qs from "qs";

const parseFormData = (req, res, next) => {
  try {
    const parsed = qs.parse(req.body, {
      allowDots: true,   // يسمح بـ ar.name
      depth: 10          // nesting عميق
    });

    // تحويل JSON strings (arrays / objects)
    const parseValues = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(parseValues);
      }

      if (obj && typeof obj === "object") {
        for (const key in obj) {
          obj[key] = parseValues(obj[key]);
        }
        return obj;
      }

      if (typeof obj === "string") {
        try {
          return JSON.parse(obj);
        } catch {
          return obj;
        }
      }

      return obj;
    };

    req.body = parseValues(parsed);

    next();
  } catch (err) {
    return res.status(400).json({
      status: "error",
      message: "Invalid form-data format",
      error: err.message
    });
  }
};

export default parseFormData;
