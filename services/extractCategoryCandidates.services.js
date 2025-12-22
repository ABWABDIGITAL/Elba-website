export function extractCategoryCandidates(results) {
  const map = new Map();

  for (const r of results) {
    if (!r.category) continue;

    const id = r.category.toString();

    if (!map.has(id)) {
      map.set(id, {
        id,
        sampleTitle: r?.ar?.title || r?.en?.title || "Unknown product"
      });
    }
  }

  return [...map.values()];
}
