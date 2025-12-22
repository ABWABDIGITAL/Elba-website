import "dotenv/config";
import { vectorRawSearch } from "../services/vectorRawSearch.services.js";
import { inferCategoryFromResults } from "../services/inferCategoryFromResults.services.js";

const q = process.argv.slice(2).join(" ") || "عايز ثلاجة سامسونج";
const results = await vectorRawSearch(q, 30);

const inferred = inferCategoryFromResults(results);

console.log("Query:", q);
console.log("Top30:", results.length);
console.log("Inferred category:", inferred);
process.exit(0);
