import qs from "qs";

const parseNestedDot = (req, res, next) => {
  try {
    // First, parse the form data
    const parsed = qs.parse(req.body);

    // Function to convert dot notation to nested objects
    const expand = (obj) => {
      const result = {};

      // For each key in the parsed object
      for (const key in obj) {
        const value = obj[key];
        
        // Skip prototype properties
        if (!obj.hasOwnProperty(key)) continue;

        // Handle nested keys (like 'name.en', 'title.ar')
        const keys = key.split('.');
        let current = result;

        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          
          // If this is the last key, set the value
          if (i === keys.length - 1) {
            // Try to parse JSON strings
            if (typeof value === 'string') {
              try {
                current[k] = JSON.parse(value);
              } catch {
                current[k] = value;
              }
            } else {
              current[k] = value;
            }
          } 
          // Otherwise, create nested objects as needed
          else {
            if (!current[k] || typeof current[k] !== 'object') {
              current[k] = {};
            }
            current = current[k];
          }
        }
      }

      return result;
    };

    // Apply the expansion to the parsed data
    req.body = expand(parsed);

    next();
  } catch (err) {
    next(err);
  }
};

export default parseNestedDot;