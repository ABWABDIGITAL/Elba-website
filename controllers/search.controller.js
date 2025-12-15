import { vectorSearchService } from "../services/vectorSearch.services.js";

export const vectorSearchController = async (req, res, next) => {
  try {
    const { query, limit } = req.body;
    if (!query) {
      return res.status(400).json({ message: "query is required" });
    }

    const results = await vectorSearchService(query, limit);
    res.json({
      ok: true,
      results,
    });
  } catch (err) {
    next(err);
  }
};
