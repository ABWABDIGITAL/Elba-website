import "dotenv/config";
import { vectorRawSearch } from "../services/vectorRawSearch.services.js";
import { inferCategoryFromResults } from "../services/inferCategoryFromResults.services.js";
import { extractCategoryCandidates } from "../services/extractCategoryCandidates.services.js";
import { validateCategoryWithGemini } from "../services/validateCategoryWithGemini..services.js";

const q = process.argv.slice(2).join(" ") || "عايز ثلاجة سامسونج";

const results = await vectorRawSearch(q, 30);
const inferred = inferCategoryFromResults(results);
const candidates = extractCategoryCandidates(results);

const finalCategory = await validateCategoryWithGemini({
  query: q,
  inferredCategoryId: inferred,
  categoryCandidates: candidates,
});

console.log("Query:", q);
console.log("Inferred categoryId:", inferred);
console.log("Gemini final categoryId:", finalCategory);

process.exit(0);
