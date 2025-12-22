export function inferCategoryFromResults(results) {
  const counter = new Map();

  for (const r of results) {
    const cat =
      r?.category?.name ||
      r?.category ||
      (Array.isArray(r?.categories) ? r.categories[0] : null) ||
      null;

    if (!cat) continue;

    const key = String(cat);
    counter.set(key, (counter.get(key) || 0) + 1);
  }

  if (counter.size === 0) return null;

  return [...counter.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
