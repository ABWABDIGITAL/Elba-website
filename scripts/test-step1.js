import "dotenv/config";
import { vectorRawSearch } from "../services/vectorRawSearch.services.js";

const q = process.argv.slice(2).join(" ") || "عايز ثلاجة سامسونج";

const res = await vectorRawSearch(q, 10);
console.log("Query:", q);
console.log("Count:", res.length);
console.log(
  res.map((x) => ({
    title: x?.ar?.title || x?.en?.title,
    score: x.score,
    category: x.category,
    brand: x.brand,
    sizeType: x.sizeType,
  }))
);
process.exit(0);
