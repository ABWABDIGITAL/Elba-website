/**
 * Migration: Convert string-based product tags → Tag collection ObjectIds
 *
 * What it does:
 *  1. Seeds 13 system tags (12 existing + special_offer) into the Tag collection
 *  2. Reads every product's string-based `tags` array
 *  3. Resolves each string to its Tag ObjectId
 *  4. Writes the ObjectId array back to the product
 *
 * Run:  node scripts/migrateTagsToCollection.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Tag from "../models/tag.model.js";
import Product from "../models/product.model.js";

/* --------------------------------------------------
   SYSTEM TAG DEFINITIONS (13 total)
--------------------------------------------------- */
const SYSTEM_TAGS = [
  // Automation-enabled tags (match TAG_RULES keys in tagAutomation.services.js)
  {
    name: { en: "Best Seller", ar: "الأكثر مبيعاً" },
    slug: "best-seller",
    type: "automatic",
    automationKey: "best_seller",
    isSystem: true,
    icon: "🏆",
  },
  {
    name: { en: "Hot", ar: "رائج" },
    slug: "hot",
    type: "automatic",
    automationKey: "hot",
    isSystem: true,
    icon: "🔥",
  },
  {
    name: { en: "New Arrival", ar: "وصل حديثاً" },
    slug: "new-arrival",
    type: "automatic",
    automationKey: "new_arrival",
    isSystem: true,
    icon: "🆕",
  },
  {
    name: { en: "Trending", ar: "شائع" },
    slug: "trending",
    type: "automatic",
    automationKey: "trending",
    isSystem: true,
    icon: "📈",
  },
  {
    name: { en: "On Sale", ar: "تخفيضات" },
    slug: "on-sale",
    type: "automatic",
    automationKey: "on_sale",
    isSystem: true,
    icon: "🏷️",
  },
  {
    name: { en: "Clearance", ar: "تصفية" },
    slug: "clearance",
    type: "automatic",
    automationKey: "clearance",
    isSystem: true,
    icon: "📦",
  },
  {
    name: { en: "Top Rated", ar: "الأعلى تقييماً" },
    slug: "top-rated",
    type: "automatic",
    automationKey: "top_rated",
    isSystem: true,
    icon: "⭐",
  },
  {
    name: { en: "Limited Edition", ar: "إصدار محدود" },
    slug: "limited-edition",
    type: "automatic",
    automationKey: "limited_edition",
    isSystem: true,
    icon: "💎",
  },
  {
    name: { en: "Special Offer", ar: "عرض خاص" },
    slug: "special-offer",
    type: "automatic",
    automationKey: "special_offer",
    isSystem: true,
    icon: "🎁",
  },
  // Manual-only system tags (no automation rules)
  {
    name: { en: "Featured", ar: "مميز" },
    slug: "featured",
    type: "manual",
    automationKey: "featured",
    isSystem: true,
    icon: "⭐",
  },
  {
    name: { en: "Eco Friendly", ar: "صديق للبيئة" },
    slug: "eco-friendly",
    type: "manual",
    automationKey: "eco_friendly",
    isSystem: true,
    icon: "🌿",
  },
  {
    name: { en: "Recommended", ar: "موصى به" },
    slug: "recommended",
    type: "manual",
    automationKey: "recommended",
    isSystem: true,
    icon: "👍",
  },
  {
    name: { en: "Exclusive", ar: "حصري" },
    slug: "exclusive",
    type: "manual",
    automationKey: "exclusive",
    isSystem: true,
    icon: "🔒",
  },
];

/* --------------------------------------------------
   MAIN MIGRATION
--------------------------------------------------- */
async function migrate() {
  await connectDB();
  console.log("Connected to MongoDB\n");

  // --- Step 1: Seed system tags ---
  console.log("=== Step 1: Seeding system tags ===");
  const keyToId = {};

  for (const tagDef of SYSTEM_TAGS) {
    let existing = await Tag.findOne({ automationKey: tagDef.automationKey });
    if (existing) {
      console.log(`  ✓ Tag "${tagDef.name.en}" already exists (${existing._id})`);
      keyToId[tagDef.automationKey] = existing._id;
    } else {
      const tag = await Tag.create(tagDef);
      console.log(`  + Created "${tag.name.en}" (${tag._id})`);
      keyToId[tag.automationKey] = tag._id;
    }
  }
  console.log(`\n  Total system tags mapped: ${Object.keys(keyToId).length}\n`);

  // --- Step 2: Migrate product tags ---
  console.log("=== Step 2: Migrating product tags ===");

  // Use raw MongoDB to read string tags (Mongoose schema now expects ObjectIds)
  const db = mongoose.connection.db;
  const productsCollection = db.collection("products");
  const allProducts = await productsCollection.find({}).toArray();

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of allProducts) {
    const oldTags = product.tags || [];

    // Skip if no tags or already ObjectIds
    if (oldTags.length === 0) {
      skipped++;
      continue;
    }

    // Check if tags are already ObjectIds
    const firstTag = oldTags[0];
    if (typeof firstTag !== "string") {
      skipped++;
      continue;
    }

    // Map string tags to ObjectIds
    const newTagIds = [];
    for (const tagStr of oldTags) {
      const tagId = keyToId[tagStr];
      if (tagId) {
        newTagIds.push(tagId);
      } else {
        console.log(`  ⚠ Unknown tag "${tagStr}" on product ${product.sku || product._id} – skipping`);
      }
    }

    try {
      await productsCollection.updateOne(
        { _id: product._id },
        { $set: { tags: newTagIds } }
      );
      migrated++;
    } catch (err) {
      console.log(`  ✗ Failed to migrate product ${product.sku || product._id}: ${err.message}`);
      errors++;
    }
  }

  // --- Step 3: Recalculate tag product counts ---
  console.log("\n=== Step 3: Recalculating tag product counts ===");
  for (const [key, tagId] of Object.entries(keyToId)) {
    const count = await productsCollection.countDocuments({ tags: tagId });
    await Tag.findByIdAndUpdate(tagId, { productCount: count });
    if (count > 0) console.log(`  ${key}: ${count} products`);
  }

  // --- Summary ---
  console.log("\n=== Migration Summary ===");
  console.log(`  Total products: ${allProducts.length}`);
  console.log(`  Migrated:       ${migrated}`);
  console.log(`  Skipped:        ${skipped} (no tags or already ObjectIds)`);
  console.log(`  Errors:         ${errors}`);
  console.log("\nDone!");

  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
