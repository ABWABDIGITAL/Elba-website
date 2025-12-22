import { vectorSearchService } from "../services/vectorSearch.services.js";

export async function vectorSearchController(req, res) {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        ok: false,
        message: "query is required",
      });
    }

    const results = await vectorSearchService(query);

    res.json({
      ok: true,
      results,
    });
  } catch (error) {
    console.error("❌ Vector Search Error:", error.message);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}

