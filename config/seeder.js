import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import { recalcCategoryProductCounts } from "../utlis/recalcCategoryProductCounts.js";
import Blog from "../models/blog.model.js";
import StaticPage from "../models/staticPage.model.js";
import Branch from "../models/branches.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";

/* --------------------------------------------------
   SEED CATEGORIES
--------------------------------------------------- */
const seedCategories = async () => {
  const categories = [
    {
      en: { name: "Refrigerators", slug: "refrigerators" },
      ar: { name: "ثلاجات", slug: "refrigerators" },
      image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=300&fit=crop",
      isActive: true,
      type: "Large",
    },
    {
      en: { name: "Washing Machines", slug: "washing-machines" },
      ar: { name: "غسالات", slug: "washing-machines" },
      image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=300&fit=crop",
      isActive: true,
      type: "Large",
    },
    {
      en: { name: "Air Conditioners", slug: "air-conditioners" },
      ar: { name: "مكيفات", slug: "air-conditioners" },
      image: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=400&h=300&fit=crop",
      isActive: true,
      type: "Large",
    },
    {
      en: { name: "Ovens", slug: "ovens" },
      ar: { name: "أفران", slug: "ovens" },
      image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&h=300&fit=crop",
      isActive: true,
      type: "Large",
    },
    {
      en: { name: "Dishwashers", slug: "dishwashers" },
      ar: { name: "غسالات صحون", slug: "dishwashers" },
      image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop",
      isActive: true,
      type: "Large",
    },
    {
      en: { name: "Microwaves", slug: "microwaves" },
      ar: { name: "ميكروويف", slug: "microwaves" },
      image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400&h=300&fit=crop",
      isActive: true,
      type: "Small",
    },
    {
      en: { name: "Kettles", slug: "kettles" },
      ar: { name: "غلايات", slug: "kettles" },
      image: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=400&h=300&fit=crop",
      isActive: true,
      type: "Small",
    },
    {
      en: { name: "Coffee Makers", slug: "coffee-makers" },
      ar: { name: "صانعات القهوة", slug: "coffee-makers" },
      image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400&h=300&fit=crop",
      isActive: true,
      type: "Small",
    },
    {
      en: { name: "Blenders", slug: "blenders" },
      ar: { name: "خلاطات", slug: "blenders" },
      image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=300&fit=crop",
      isActive: true,
      type: "Small",
    },
    {
      en: { name: "Toasters", slug: "toasters" },
      ar: { name: "محمصات خبز", slug: "toasters" },
      image: "https://images.unsplash.com/photo-1550963295-019d8a8a61c5?w=400&h=300&fit=crop",
      isActive: true,
      type: "Small",
    },
    {
      en: { name: "Vacuum Cleaners", slug: "vacuum-cleaners" },
      ar: { name: "مكانس كهربائية", slug: "vacuum-cleaners" },
      image: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=300&fit=crop",
      isActive: true,
      type: "Small",
    },
    {
      en: { name: "Irons", slug: "irons" },
      ar: { name: "مكاوي", slug: "irons" },
      image: "https://images.unsplash.com/photo-1582735689115-3bfac2eb6318?w=400&h=300&fit=crop",
      isActive: true,
      type: "Small",
    },
    {
      en: { name: "Cooktops", slug: "cooktops" },
      ar: { name: "مواقد الطبخ", slug: "cooktops" },
      image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop",
      isActive: true,
      type: "Large",
    },
    {
      en: { name: "Range Hoods", slug: "range-hoods" },
      ar: { name: "شفاطات المطبخ", slug: "range-hoods" },
      image: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400&h=300&fit=crop",
      isActive: true,
      type: "Large",
    },
  ];

  for (const cat of categories) {
  const existing = await Category.findOne({ "en.slug": cat.en.slug });
  
  if (!existing) {
    // For new categories, set productCount to 0
    await Category.create({ ...cat, productCount: 0 });
    console.log(`✓ Created category: ${cat.en.name}`);
  } else {
    // For existing categories, update all fields except productCount
    const { productCount, ...updateData } = cat;
    await Category.findByIdAndUpdate(
      existing._id,
      { $set: updateData },
      { new: true }
    );
    console.log(`✓ Updated category: ${cat.en.name} (preserved productCount)`);
  }
}

// Clean up categories not in the seed data
const slugs = categories.map(c => c.en.slug);
const deleteResult = await Category.deleteMany({
  "en.slug": { $nin: slugs }
});

if (deleteResult.deletedCount > 0) {
  console.log(`✓ Removed ${deleteResult.deletedCount} old categories`);
}
};

/* --------------------------------------------------
   SEED BRANDS
--------------------------------------------------- */
const seedBrands = async () => {
  const brands = [
    {
      en: { name: "Samsung", slug: "samsung" },
      ar: { name: "سامسونج", slug: "samsung" },
      logo: "https://logo.clearbit.com/samsung.com",
      isActive: true,
    },
    {
      en: { name: "LG", slug: "lg" },
      ar: { name: "إل جي", slug: "lg" },
      logo: "https://logo.clearbit.com/lg.com",
      isActive: true,
    },
    {
      en: { name: "Bosch", slug: "bosch" },
      ar: { name: "بوش", slug: "bosch" },
      logo: "https://logo.clearbit.com/bosch.com",
      isActive: true,
    },
    {
      en: { name: "Whirlpool", slug: "whirlpool" },
      ar: { name: "ويرلبول", slug: "whirlpool" },
      logo: "https://logo.clearbit.com/whirlpool.com",
      isActive: true,
    },
    {
      en: { name: "Siemens", slug: "siemens" },
      ar: { name: "سيمنس", slug: "siemens" },
      logo: "https://logo.clearbit.com/siemens.com",
      isActive: true,
    },
    {
      en: { name: "Electrolux", slug: "electrolux" },
      ar: { name: "إلكترولوكس", slug: "electrolux" },
      logo: "https://logo.clearbit.com/electrolux.com",
      isActive: true,
    },
    {
      en: { name: "Panasonic", slug: "panasonic" },
      ar: { name: "باناسونيك", slug: "panasonic" },
      logo: "https://logo.clearbit.com/panasonic.com",
      isActive: true,
    },
    {
      en: { name: "Haier", slug: "haier" },
      ar: { name: "هاير", slug: "haier" },
      logo: "https://logo.clearbit.com/haier.com",
      isActive: true,
    },
    {
      en: { name: "Philips", slug: "philips" },
      ar: { name: "فيليبس", slug: "philips" },
      logo: "https://logo.clearbit.com/philips.com",
      isActive: true,
    },
    {
      en: { name: "Braun", slug: "braun" },
      ar: { name: "براون", slug: "braun" },
      logo: "https://logo.clearbit.com/braun.com",
      isActive: true,
    },
    {
      en: { name: "Kenwood", slug: "kenwood" },
      ar: { name: "كينوود", slug: "kenwood" },
      logo: "https://logo.clearbit.com/kenwood.com",
      isActive: true,
    },
    {
      en: { name: "Tefal", slug: "tefal" },
      ar: { name: "تيفال", slug: "tefal" },
      logo: "https://logo.clearbit.com/tefal.com",
      isActive: true,
    },
  ];

  for (const brand of brands) {
    const existing = await Brand.findOne({ "en.slug": brand.en.slug });
    if (!existing) {
      await Brand.create(brand);
      console.log(`✓ Created brand: ${brand.en.name}`);
    }
  }
};

/* --------------------------------------------------
   SEED PRODUCTS - 50+ Real Products
--------------------------------------------------- */
const seedProducts = async () => {
  const categories = await Category.find().lean();
  const brands = await Brand.find().lean();

  if (categories.length === 0 || brands.length === 0) {
    console.log("⚠ Cannot seed products: Categories or brands not found");
    return;
  }

  // Get categories
  const refrigeratorsCategory = categories.find(c => c.en.slug === "refrigerators");
  const washingMachinesCategory = categories.find(c => c.en.slug === "washing-machines");
  const airConditionersCategory = categories.find(c => c.en.slug === "air-conditioners");
  const ovensCategory = categories.find(c => c.en.slug === "ovens");
  const dishwashersCategory = categories.find(c => c.en.slug === "dishwashers");
  const microwavesCategory = categories.find(c => c.en.slug === "microwaves");
  const kettlesCategory = categories.find(c => c.en.slug === "kettles");
  const coffeeMakersCategory = categories.find(c => c.en.slug === "coffee-makers");
  const blendersCategory = categories.find(c => c.en.slug === "blenders");
  const toastersCategory = categories.find(c => c.en.slug === "toasters");
  const vacuumCleanersCategory = categories.find(c => c.en.slug === "vacuum-cleaners");
  const ironsCategory = categories.find(c => c.en.slug === "irons");
  const cooktopsCategory = categories.find(c => c.en.slug === "cooktops");
  const rangeHoodsCategory = categories.find(c => c.en.slug === "range-hoods");

  // Get brands
  const samsungBrand = brands.find(b => b.en.slug === "samsung");
  const lgBrand = brands.find(b => b.en.slug === "lg");
  const boschBrand = brands.find(b => b.en.slug === "bosch");
  const whirlpoolBrand = brands.find(b => b.en.slug === "whirlpool");
  const siemensBrand = brands.find(b => b.en.slug === "siemens");
  const electroluxBrand = brands.find(b => b.en.slug === "electrolux");
  const panasonicBrand = brands.find(b => b.en.slug === "panasonic");
  const haierBrand = brands.find(b => b.en.slug === "haier");
  const philipsBrand = brands.find(b => b.en.slug === "philips");
  const braunBrand = brands.find(b => b.en.slug === "braun");
  const kenwoodBrand = brands.find(b => b.en.slug === "kenwood");
  const tefalBrand = brands.find(b => b.en.slug === "tefal");

  const products = [
    // REFRIGERATORS (8 products)
    {
      ar: {
        title: "ثلاجة سامسونج فرنش دور 18 قدم",
        subTitle: "تقنية التبريد المزدوج مع موزع ماء وثلج",
        description: [{ title: "نظرة عامة", content: "ثلاجة سامسونج الفاخرة بتصميم الأبواب الفرنسية مع تقنية Twin Cooling Plus" }],
        specifications: [
          { key: "السعة", value: "18", unit: "قدم مكعب", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["تقنية Twin Cooling Plus", "موزع ماء وثلج", "إضاءة LED"],
        warranty: "ضمان سنتين شامل",
      },
      en: {
        title: "Samsung 18 Cu.Ft French Door Refrigerator",
        subTitle: "Twin Cooling Plus with Water & Ice Dispenser",
        description: [{ title: "Overview", content: "Samsung premium French door refrigerator with Twin Cooling Plus technology" }],
        specifications: [
          { key: "Capacity", value: "18", unit: "cu.ft", group: "Capacity" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["Twin Cooling Plus", "Water & Ice Dispenser", "LED Lighting"],
        warranty: "2-year comprehensive warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop" }],
      sku: "SAM-RF18A5101SR",
      modelNumber: "RF18A5101SR",
      category: refrigeratorsCategory._id,
      brand: samsungBrand._id,
      price: 4500,
      discountPrice: 500,
      stock: 25,
      status: "active",
      sizeType: "large",
      tags: ["best_seller", "featured", "top_rated"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ثلاجة LG جنب إلى جنب 26 قدم",
        subTitle: "InstaView Door-in-Door مع إنفيرتر",
        description: [{ title: "نظرة عامة", content: "ثلاجة LG بتقنية InstaView الفريدة" }],
        specifications: [
          { key: "السعة", value: "26", unit: "قدم مكعب", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A+", unit: "", group: "الطاقة" },
        ],
        features: ["InstaView Door-in-Door", "Smart Diagnosis", "LED Lighting"],
        warranty: "ضمان سنتين شامل",
      },
      en: {
        title: "LG 26 Cu.Ft Side-by-Side Refrigerator",
        subTitle: "InstaView Door-in-Door with Inverter",
        description: [{ title: "Overview", content: "LG refrigerator with InstaView technology" }],
        specifications: [
          { key: "Capacity", value: "26", unit: "cu.ft", group: "Capacity" },
          { key: "Energy Efficiency", value: "A+", unit: "", group: "Energy" },
        ],
        features: ["InstaView Door-in-Door", "Smart Diagnosis", "LED Lighting"],
        warranty: "2-year comprehensive warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&h=800&fit=crop" }],
      sku: "LG-LRMVS2806S",
      modelNumber: "LRMVS2806S",
      category: refrigeratorsCategory._id,
      brand: lgBrand._id,
      price: 6200,
      discountPrice: 700,
      stock: 18,
      status: "active",
      sizeType: "large",
      tags: ["featured", "new_arrival"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ثلاجة بوش بباب واحد 350 لتر",
        subTitle: "تكنولوجيا VitaFresh للحفاظ على النضارة",
        description: [{ title: "نظرة عامة", content: "ثلاجة بوش موفرة للطاقة" }],
        specifications: [
          { key: "السعة", value: "350", unit: "لتر", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["تقنية VitaFresh", "Super Cooling", "LED Lighting"],
        warranty: "ضمان سنتين شامل",
      },
      en: {
        title: "Bosch 350L Single Door Refrigerator",
        subTitle: "VitaFresh Technology",
        description: [{ title: "Overview", content: "Bosch energy-efficient refrigerator" }],
        specifications: [
          { key: "Capacity", value: "350", unit: "L", group: "Capacity" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["VitaFresh Technology", "Super Cooling", "LED Lighting"],
        warranty: "2-year comprehensive warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop&sat=-50" }],
      sku: "BOSCH-KGN36VL35",
      modelNumber: "KGN36VL35",
      category: refrigeratorsCategory._id,
      brand: boschBrand._id,
      price: 3800,
      discountPrice: 400,
      stock: 30,
      status: "active",
      sizeType: "large",
      tags: ["eco_friendly", "recommended"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ثلاجة ويرلبول 21 قدم بابين",
        subTitle: "نظام التبريد الذكي 6th Sense",
        description: [{ title: "نظرة عامة", content: "ثلاجة ويرلبول بتقنية 6th Sense" }],
        specifications: [
          { key: "السعة", value: "21", unit: "قدم مكعب", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A+", unit: "", group: "الطاقة" },
        ],
        features: ["6th Sense Technology", "Adaptive Intelligence", "LED"],
        warranty: "ضمان سنتين شامل",
      },
      en: {
        title: "Whirlpool 21 Cu.Ft Top Mount Refrigerator",
        subTitle: "6th Sense Smart Cooling",
        description: [{ title: "Overview", content: "Whirlpool refrigerator with 6th Sense technology" }],
        specifications: [
          { key: "Capacity", value: "21", unit: "cu.ft", group: "Capacity" },
          { key: "Energy Efficiency", value: "A+", unit: "", group: "Energy" },
        ],
        features: ["6th Sense Technology", "Adaptive Intelligence", "LED"],
        warranty: "2-year comprehensive warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop&hue=20" }],
      sku: "WHIR-WRT311FZDW",
      modelNumber: "WRT311FZDW",
      category: refrigeratorsCategory._id,
      brand: whirlpoolBrand._id,
      price: 3200,
      discountPrice: 350,
      stock: 22,
      status: "active",
      sizeType: "large",
      tags: ["best_seller"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ثلاجة سيمنز 24 قدم فرنش دور",
        subTitle: "تكنولوجيا HyperFresh Plus",
        description: [{ title: "نظرة عامة", content: "ثلاجة سيمنز الألمانية الفاخرة" }],
        specifications: [
          { key: "السعة", value: "24", unit: "قدم مكعب", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A+++", unit: "", group: "الطاقة" },
        ],
        features: ["HyperFresh Plus", "Home Connect", "LED"],
        warranty: "ضمان 3 سنوات",
      },
      en: {
        title: "Siemens 24 Cu.Ft French Door Refrigerator",
        subTitle: "HyperFresh Plus Technology",
        description: [{ title: "Overview", content: "Siemens premium German refrigerator" }],
        specifications: [
          { key: "Capacity", value: "24", unit: "cu.ft", group: "Capacity" },
          { key: "Energy Efficiency", value: "A+++", unit: "", group: "Energy" },
        ],
        features: ["HyperFresh Plus", "Home Connect", "LED"],
        warranty: "3-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&h=800&fit=crop&sat=-30" }],
      sku: "SIEM-KF96RSBEA",
      modelNumber: "KF96RSBEA",
      category: refrigeratorsCategory._id,
      brand: siemensBrand._id,
      price: 7500,
      discountPrice: 900,
      stock: 12,
      status: "active",
      sizeType: "large",
      tags: ["exclusive", "top_rated"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ثلاجة إلكترولوكس 16 قدم بابين",
        subTitle: "تقنية TwinTech للتبريد المزدوج",
        description: [{ title: "نظرة عامة", content: "ثلاجة إلكترولوكس السويدية" }],
        specifications: [
          { key: "السعة", value: "16", unit: "قدم مكعب", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["TwinTech Cooling", "FreshZone", "LED"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Electrolux 16 Cu.Ft Top Mount Refrigerator",
        subTitle: "TwinTech Dual Cooling",
        description: [{ title: "Overview", content: "Electrolux Swedish refrigerator" }],
        specifications: [
          { key: "Capacity", value: "16", unit: "cu.ft", group: "Capacity" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["TwinTech Cooling", "FreshZone", "LED"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop&bright=10" }],
      sku: "ELEC-ERT1641AOW",
      modelNumber: "ERT1641AOW",
      category: refrigeratorsCategory._id,
      brand: electroluxBrand._id,
      price: 2900,
      discountPrice: 300,
      stock: 28,
      status: "active",
      sizeType: "large",
      tags: ["recommended"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ثلاجة هاير 20 قدم أربعة أبواب",
        subTitle: "My Zone للتحكم الذكي بالحرارة",
        description: [{ title: "نظرة عامة", content: "ثلاجة هاير متعددة الأبواب" }],
        specifications: [
          { key: "السعة", value: "20", unit: "قدم مكعب", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A+", unit: "", group: "الطاقة" },
        ],
        features: ["My Zone Temperature Control", "Super Freeze", "LED"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Haier 20 Cu.Ft Four Door Refrigerator",
        subTitle: "My Zone Smart Temperature Control",
        description: [{ title: "Overview", content: "Haier multi-door refrigerator" }],
        specifications: [
          { key: "Capacity", value: "20", unit: "cu.ft", group: "Capacity" },
          { key: "Energy Efficiency", value: "A+", unit: "", group: "Energy" },
        ],
        features: ["My Zone Temperature Control", "Super Freeze", "LED"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&h=800&fit=crop&hue=30" }],
      sku: "HAIER-HRF520FH",
      modelNumber: "HRF520FH",
      category: refrigeratorsCategory._id,
      brand: haierBrand._id,
      price: 4800,
      discountPrice: 550,
      stock: 15,
      status: "active",
      sizeType: "large",
      tags: ["new_arrival", "trending"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ثلاجة باناسونيك 19 قدم إنفيرتر",
        subTitle: "تقنية Prime Fresh للحفظ الطازج",
        description: [{ title: "نظرة عامة", content: "ثلاجة باناسونيك بإنفيرتر موفر للطاقة" }],
        specifications: [
          { key: "السعة", value: "19", unit: "قدم مكعب", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["Inverter Compressor", "Prime Fresh", "Ag Clean"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Panasonic 19 Cu.Ft Inverter Refrigerator",
        subTitle: "Prime Fresh Technology",
        description: [{ title: "Overview", content: "Panasonic energy-saving inverter refrigerator" }],
        specifications: [
          { key: "Capacity", value: "19", unit: "cu.ft", group: "Capacity" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["Inverter Compressor", "Prime Fresh", "Ag Clean"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop&contrast=10" }],
      sku: "PANA-NRBY602XS",
      modelNumber: "NRBY602XS",
      category: refrigeratorsCategory._id,
      brand: panasonicBrand._id,
      price: 4100,
      discountPrice: 450,
      stock: 20,
      status: "active",
      sizeType: "large",
      tags: ["eco_friendly", "recommended"],
      currencyCode: "SAR",
    },

    // WASHING MACHINES (8 products)
    {
      ar: {
        title: "غسالة سامسونج فرونت لود 9 كجم",
        subTitle: "AddWash و EcoBubble",
        description: [{ title: "نظرة عامة", content: "غسالة سامسونج بتقنية EcoBubble وباب إضافي" }],
        specifications: [
          { key: "السعة", value: "9", unit: "كجم", group: "السعة" },
          { key: "سرعة العصر", value: "1400", unit: "دورة/دقيقة", group: "الأداء" },
        ],
        features: ["AddWash Door", "EcoBubble", "Digital Inverter"],
        warranty: "ضمان سنتين شامل",
      },
      en: {
        title: "Samsung 9kg Front Load Washing Machine",
        subTitle: "AddWash & EcoBubble",
        description: [{ title: "Overview", content: "Samsung washer with EcoBubble and AddWash door" }],
        specifications: [
          { key: "Capacity", value: "9", unit: "kg", group: "Capacity" },
          { key: "Spin Speed", value: "1400", unit: "rpm", group: "Performance" },
        ],
        features: ["AddWash Door", "EcoBubble", "Digital Inverter"],
        warranty: "2-year comprehensive warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop" }],
      sku: "SAM-WW90K5410",
      modelNumber: "WW90K5410",
      category: washingMachinesCategory._id,
      brand: samsungBrand._id,
      price: 2800,
      discountPrice: 350,
      stock: 35,
      status: "active",
      sizeType: "large",
      tags: ["best_seller", "top_rated"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة LG فرونت لود 10.5 كجم",
        subTitle: "TurboWash 360 و AI DD",
        description: [{ title: "نظرة عامة", content: "غسالة LG بالذكاء الاصطناعي" }],
        specifications: [
          { key: "السعة", value: "10.5", unit: "كجم", group: "السعة" },
          { key: "سرعة العصر", value: "1400", unit: "دورة/دقيقة", group: "الأداء" },
        ],
        features: ["AI Direct Drive", "TurboWash 360", "Steam"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "LG 10.5kg Front Load Washing Machine",
        subTitle: "TurboWash 360 & AI DD",
        description: [{ title: "Overview", content: "LG washer with AI technology" }],
        specifications: [
          { key: "Capacity", value: "10.5", unit: "kg", group: "Capacity" },
          { key: "Spin Speed", value: "1400", unit: "rpm", group: "Performance" },
        ],
        features: ["AI Direct Drive", "TurboWash 360", "Steam"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop&sat=-20" }],
      sku: "LG-F4V9RCS2E",
      modelNumber: "F4V9RCS2E",
      category: washingMachinesCategory._id,
      brand: lgBrand._id,
      price: 3200,
      discountPrice: 400,
      stock: 28,
      status: "active",
      sizeType: "large",
      tags: ["featured", "new_arrival"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة بوش 8 كجم فرونت لود",
        subTitle: "VarioPerfect و AntiVibration",
        description: [{ title: "نظرة عامة", content: "غسالة بوش الألمانية الهادئة" }],
        specifications: [
          { key: "السعة", value: "8", unit: "كجم", group: "السعة" },
          { key: "سرعة العصر", value: "1200", unit: "دورة/دقيقة", group: "الأداء" },
        ],
        features: ["VarioPerfect", "AntiVibration", "EcoSilence Drive"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 8kg Front Load Washing Machine",
        subTitle: "VarioPerfect & AntiVibration",
        description: [{ title: "Overview", content: "Bosch German quiet washing machine" }],
        specifications: [
          { key: "Capacity", value: "8", unit: "kg", group: "Capacity" },
          { key: "Spin Speed", value: "1200", unit: "rpm", group: "Performance" },
        ],
        features: ["VarioPerfect", "AntiVibration", "EcoSilence Drive"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop&hue=20" }],
      sku: "BOSCH-WAJ28262",
      modelNumber: "WAJ28262",
      category: washingMachinesCategory._id,
      brand: boschBrand._id,
      price: 2400,
      discountPrice: 280,
      stock: 32,
      status: "active",
      sizeType: "large",
      tags: ["eco_friendly", "recommended"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة ويرلبول توب لود 12 كجم",
        subTitle: "Supreme Care و 6th Sense",
        description: [{ title: "نظرة عامة", content: "غسالة ويرلبول تحميل علوي بسعة كبيرة" }],
        specifications: [
          { key: "السعة", value: "12", unit: "كجم", group: "السعة" },
          { key: "عدد البرامج", value: "15", unit: "", group: "البرامج" },
        ],
        features: ["6th Sense Technology", "Supreme Care", "Soft Opening"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Whirlpool 12kg Top Load Washing Machine",
        subTitle: "Supreme Care & 6th Sense",
        description: [{ title: "Overview", content: "Whirlpool top load washer with large capacity" }],
        specifications: [
          { key: "Capacity", value: "12", unit: "kg", group: "Capacity" },
          { key: "Programs", value: "15", unit: "", group: "Programs" },
        ],
        features: ["6th Sense Technology", "Supreme Care", "Soft Opening"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop&bright=10" }],
      sku: "WHIR-TDLR70220",
      modelNumber: "TDLR70220",
      category: washingMachinesCategory._id,
      brand: whirlpoolBrand._id,
      price: 1900,
      discountPrice: 200,
      stock: 40,
      status: "active",
      sizeType: "large",
      tags: ["best_seller"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة سيمنز 9 كجم فرونت لود",
        subTitle: "iSensoric و speedPerfect",
        description: [{ title: "نظرة عامة", content: "غسالة سيمنز بتقنية iSensoric الذكية" }],
        specifications: [
          { key: "السعة", value: "9", unit: "كجم", group: "السعة" },
          { key: "سرعة العصر", value: "1400", unit: "دورة/دقيقة", group: "الأداء" },
        ],
        features: ["iSensoric", "speedPerfect", "varioPerfect"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Siemens 9kg Front Load Washing Machine",
        subTitle: "iSensoric & speedPerfect",
        description: [{ title: "Overview", content: "Siemens washer with iSensoric smart technology" }],
        specifications: [
          { key: "Capacity", value: "9", unit: "kg", group: "Capacity" },
          { key: "Spin Speed", value: "1400", unit: "rpm", group: "Performance" },
        ],
        features: ["iSensoric", "speedPerfect", "varioPerfect"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop&sat=-40" }],
      sku: "SIEM-WM14T790",
      modelNumber: "WM14T790",
      category: washingMachinesCategory._id,
      brand: siemensBrand._id,
      price: 3800,
      discountPrice: 500,
      stock: 18,
      status: "active",
      sizeType: "large",
      tags: ["exclusive", "top_rated"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة إلكترولوكس 7 كجم فرونت لود",
        subTitle: "UltraCare و VapourCare",
        description: [{ title: "نظرة عامة", content: "غسالة إلكترولوكس بتقنية البخار" }],
        specifications: [
          { key: "السعة", value: "7", unit: "كجم", group: "السعة" },
          { key: "سرعة العصر", value: "1200", unit: "دورة/دقيقة", group: "الأداء" },
        ],
        features: ["VapourCare", "UltraCare", "Time Manager"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Electrolux 7kg Front Load Washing Machine",
        subTitle: "UltraCare & VapourCare",
        description: [{ title: "Overview", content: "Electrolux washer with steam technology" }],
        specifications: [
          { key: "Capacity", value: "7", unit: "kg", group: "Capacity" },
          { key: "Spin Speed", value: "1200", unit: "rpm", group: "Performance" },
        ],
        features: ["VapourCare", "UltraCare", "Time Manager"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop&hue=-20" }],
      sku: "ELEC-EWF1276",
      modelNumber: "EWF1276",
      category: washingMachinesCategory._id,
      brand: electroluxBrand._id,
      price: 2100,
      discountPrice: 250,
      stock: 25,
      status: "active",
      sizeType: "large",
      tags: ["recommended"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة هاير توب لود 11 كجم",
        subTitle: "Oceanus Wave و Pillow Drum",
        description: [{ title: "نظرة عامة", content: "غسالة هاير تحميل علوي بطبلة لطيفة" }],
        specifications: [
          { key: "السعة", value: "11", unit: "كجم", group: "السعة" },
          { key: "عدد البرامج", value: "12", unit: "", group: "البرامج" },
        ],
        features: ["Oceanus Wave", "Pillow Drum", "Smart Balance"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Haier 11kg Top Load Washing Machine",
        subTitle: "Oceanus Wave & Pillow Drum",
        description: [{ title: "Overview", content: "Haier top load washer with gentle drum" }],
        specifications: [
          { key: "Capacity", value: "11", unit: "kg", group: "Capacity" },
          { key: "Programs", value: "12", unit: "", group: "Programs" },
        ],
        features: ["Oceanus Wave", "Pillow Drum", "Smart Balance"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop&contrast=10" }],
      sku: "HAIER-HWM110-1678",
      modelNumber: "HWM110-1678",
      category: washingMachinesCategory._id,
      brand: haierBrand._id,
      price: 1600,
      discountPrice: 150,
      stock: 35,
      status: "active",
      sizeType: "large",
      tags: ["trending"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة باناسونيك 8 كجم فرونت لود",
        subTitle: "StainMaster و ActiveFoam",
        description: [{ title: "نظرة عامة", content: "غسالة باناسونيك بتقنية الرغوة النشطة" }],
        specifications: [
          { key: "السعة", value: "8", unit: "كجم", group: "السعة" },
          { key: "سرعة العصر", value: "1200", unit: "دورة/دقيقة", group: "الأداء" },
        ],
        features: ["ActiveFoam", "StainMaster+", "Inverter"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Panasonic 8kg Front Load Washing Machine",
        subTitle: "StainMaster & ActiveFoam",
        description: [{ title: "Overview", content: "Panasonic washer with active foam technology" }],
        specifications: [
          { key: "Capacity", value: "8", unit: "kg", group: "Capacity" },
          { key: "Spin Speed", value: "1200", unit: "rpm", group: "Performance" },
        ],
        features: ["ActiveFoam", "StainMaster+", "Inverter"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop&bright=-10" }],
      sku: "PANA-NA128XB1",
      modelNumber: "NA128XB1",
      category: washingMachinesCategory._id,
      brand: panasonicBrand._id,
      price: 2300,
      discountPrice: 280,
      stock: 30,
      status: "active",
      sizeType: "large",
      tags: ["eco_friendly"],
      currencyCode: "SAR",
    },

    // AIR CONDITIONERS (6 products)
    {
      ar: {
        title: "مكيف سامسونج سبليت 18000 وحدة",
        subTitle: "Digital Inverter و Wind-Free Cooling",
        description: [{ title: "نظرة عامة", content: "مكيف سامسونج بتقنية التبريد بدون رياح" }],
        specifications: [
          { key: "السعة", value: "18000", unit: "وحدة", group: "التبريد" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["Wind-Free Cooling", "Digital Inverter", "Auto Clean"],
        warranty: "ضمان سنتين + 10 سنوات على الضاغط",
      },
      en: {
        title: "Samsung 18000 BTU Split AC",
        subTitle: "Digital Inverter & Wind-Free Cooling",
        description: [{ title: "Overview", content: "Samsung AC with wind-free cooling technology" }],
        specifications: [
          { key: "Capacity", value: "18000", unit: "BTU", group: "Cooling" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["Wind-Free Cooling", "Digital Inverter", "Auto Clean"],
        warranty: "2-year warranty + 10 years on compressor",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=800&h=800&fit=crop" }],
      sku: "SAM-AR18TYHYCWK",
      modelNumber: "AR18TYHYCWK",
      category: airConditionersCategory._id,
      brand: samsungBrand._id,
      price: 3200,
      discountPrice: 400,
      stock: 45,
      status: "active",
      sizeType: "large",
      tags: ["best_seller", "top_rated"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكيف LG دوال إنفيرتر 24000 وحدة",
        subTitle: "ThinQ AI و Dual Inverter",
        description: [{ title: "نظرة عامة", content: "مكيف LG بالذكاء الاصطناعي" }],
        specifications: [
          { key: "السعة", value: "24000", unit: "وحدة", group: "التبريد" },
          { key: "كفاءة الطاقة", value: "A+++", unit: "", group: "الطاقة" },
        ],
        features: ["ThinQ AI", "Dual Inverter", "Plasmaster Ionizer+"],
        warranty: "ضمان سنتين + 10 سنوات على الضاغط",
      },
      en: {
        title: "LG 24000 BTU Dual Inverter AC",
        subTitle: "ThinQ AI & Dual Inverter",
        description: [{ title: "Overview", content: "LG AC with artificial intelligence" }],
        specifications: [
          { key: "Capacity", value: "24000", unit: "BTU", group: "Cooling" },
          { key: "Energy Efficiency", value: "A+++", unit: "", group: "Energy" },
        ],
        features: ["ThinQ AI", "Dual Inverter", "Plasmaster Ionizer+"],
        warranty: "2-year warranty + 10 years on compressor",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=800&h=800&fit=crop&sat=-30" }],
      sku: "LG-S4NQ24JA3QF",
      modelNumber: "S4NQ24JA3QF",
      category: airConditionersCategory._id,
      brand: lgBrand._id,
      price: 4200,
      discountPrice: 550,
      stock: 38,
      status: "active",
      sizeType: "large",
      tags: ["featured", "new_arrival"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكيف بوش إنفيرتر 12000 وحدة",
        subTitle: "Climate 8000i و Silent Mode",
        description: [{ title: "نظرة عامة", content: "مكيف بوش هادئ وقوي" }],
        specifications: [
          { key: "السعة", value: "12000", unit: "وحدة", group: "التبريد" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["Climate 8000i", "Silent Mode", "Self-Cleaning"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 12000 BTU Inverter AC",
        subTitle: "Climate 8000i & Silent Mode",
        description: [{ title: "Overview", content: "Bosch quiet and powerful AC" }],
        specifications: [
          { key: "Capacity", value: "12000", unit: "BTU", group: "Cooling" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["Climate 8000i", "Silent Mode", "Self-Cleaning"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=800&h=800&fit=crop&hue=20" }],
      sku: "BOSCH-CL8001I-12",
      modelNumber: "CL8001I-12",
      category: airConditionersCategory._id,
      brand: boschBrand._id,
      price: 2200,
      discountPrice: 250,
      stock: 50,
      status: "active",
      sizeType: "large",
      tags: ["eco_friendly", "recommended"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكيف سيمنز 18000 وحدة إنفيرتر",
        subTitle: "iQ500 و FreshSense",
        description: [{ title: "نظرة عامة", content: "مكيف سيمنز الألماني الذكي" }],
        specifications: [
          { key: "السعة", value: "18000", unit: "وحدة", group: "التبريد" },
          { key: "كفاءة الطاقة", value: "A+++", unit: "", group: "الطاقة" },
        ],
        features: ["iQ500", "FreshSense", "Home Connect"],
        warranty: "ضمان 3 سنوات",
      },
      en: {
        title: "Siemens 18000 BTU Inverter AC",
        subTitle: "iQ500 & FreshSense",
        description: [{ title: "Overview", content: "Siemens German smart AC" }],
        specifications: [
          { key: "Capacity", value: "18000", unit: "BTU", group: "Cooling" },
          { key: "Energy Efficiency", value: "A+++", unit: "", group: "Energy" },
        ],
        features: ["iQ500", "FreshSense", "Home Connect"],
        warranty: "3-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=800&h=800&fit=crop&sat=-50" }],
      sku: "SIEM-AC18IQ500",
      modelNumber: "AC18IQ500",
      category: airConditionersCategory._id,
      brand: siemensBrand._id,
      price: 4800,
      discountPrice: 650,
      stock: 22,
      status: "active",
      sizeType: "large",
      tags: ["exclusive", "top_rated"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكيف هاير 18000 وحدة إنفيرتر",
        subTitle: "Self-Clean و Turbo Cooling",
        description: [{ title: "نظرة عامة", content: "مكيف هاير بتقنية التنظيف الذاتي" }],
        specifications: [
          { key: "السعة", value: "18000", unit: "وحدة", group: "التبريد" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["Self-Clean", "Turbo Cooling", "Smart Control"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Haier 18000 BTU Inverter AC",
        subTitle: "Self-Clean & Turbo Cooling",
        description: [{ title: "Overview", content: "Haier AC with self-cleaning technology" }],
        specifications: [
          { key: "Capacity", value: "18000", unit: "BTU", group: "Cooling" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["Self-Clean", "Turbo Cooling", "Smart Control"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=800&h=800&fit=crop&bright=10" }],
      sku: "HAIER-AS18TL2HRA",
      modelNumber: "AS18TL2HRA",
      category: airConditionersCategory._id,
      brand: haierBrand._id,
      price: 2800,
      discountPrice: 320,
      stock: 42,
      status: "active",
      sizeType: "large",
      tags: ["trending"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكيف باناسونيك 24000 وحدة إنفيرتر",
        subTitle: "nanoe-G و Econavi",
        description: [{ title: "نظرة عامة", content: "مكيف باناسونيك بتقنية nanoe-G لتنقية الهواء" }],
        specifications: [
          { key: "السعة", value: "24000", unit: "وحدة", group: "التبريد" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["nanoe-G", "Econavi", "Mild Dry Cooling"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Panasonic 24000 BTU Inverter AC",
        subTitle: "nanoe-G & Econavi",
        description: [{ title: "Overview", content: "Panasonic AC with nanoe-G air purification" }],
        specifications: [
          { key: "Capacity", value: "24000", unit: "BTU", group: "Cooling" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["nanoe-G", "Econavi", "Mild Dry Cooling"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=800&h=800&fit=crop&contrast=10" }],
      sku: "PANA-CSCU24XKR",
      modelNumber: "CSCU24XKR",
      category: airConditionersCategory._id,
      brand: panasonicBrand._id,
      price: 3800,
      discountPrice: 450,
      stock: 35,
      status: "active",
      sizeType: "large",
      tags: ["eco_friendly", "recommended"],
      currencyCode: "SAR",
    },

    // SMALL APPLIANCES - Microwaves (4 products)
    {
      ar: {
        title: "ميكروويف سامسونج 28 لتر",
        subTitle: "Grill و Ceramic Enamel",
        description: [{ title: "نظرة عامة", content: "ميكروويف سامسونج بشواية" }],
        specifications: [
          { key: "السعة", value: "28", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "900", unit: "واط", group: "الطاقة" },
        ],
        features: ["Ceramic Enamel", "Grill Function", "Quick Defrost"],
        warranty: "ضمان سنة",
      },
      en: {
        title: "Samsung 28L Microwave Oven",
        subTitle: "Grill & Ceramic Enamel",
        description: [{ title: "Overview", content: "Samsung microwave with grill" }],
        specifications: [
          { key: "Capacity", value: "28", unit: "L", group: "Capacity" },
          { key: "Power", value: "900", unit: "W", group: "Power" },
        ],
        features: ["Ceramic Enamel", "Grill Function", "Quick Defrost"],
        warranty: "1-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&h=800&fit=crop" }],
      sku: "SAM-MG28J5255UB",
      modelNumber: "MG28J5255UB",
      category: microwavesCategory._id,
      brand: samsungBrand._id,
      price: 650,
      discountPrice: 70,
      stock: 60,
      status: "active",
      sizeType: "small",
      tags: ["best_seller"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ميكروويف LG 42 لتر إنفيرتر",
        subTitle: "Smart Inverter و Convection",
        description: [{ title: "نظرة عامة", content: "ميكروويف LG بإنفيرتر ذكي" }],
        specifications: [
          { key: "السعة", value: "42", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "1200", unit: "واط", group: "الطاقة" },
        ],
        features: ["Smart Inverter", "Convection", "Charcoal Lighting"],
        warranty: "ضمان سنة",
      },
      en: {
        title: "LG 42L Inverter Microwave Oven",
        subTitle: "Smart Inverter & Convection",
        description: [{ title: "Overview", content: "LG microwave with smart inverter" }],
        specifications: [
          { key: "Capacity", value: "42", unit: "L", group: "Capacity" },
          { key: "Power", value: "1200", unit: "W", group: "Power" },
        ],
        features: ["Smart Inverter", "Convection", "Charcoal Lighting"],
        warranty: "1-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&h=800&fit=crop&sat=-30" }],
      sku: "LG-MC4296OBSS",
      modelNumber: "MC4296OBSS",
      category: microwavesCategory._id,
      brand: lgBrand._id,
      price: 980,
      discountPrice: 110,
      stock: 45,
      status: "active",
      sizeType: "small",
      tags: ["featured"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ميكروويف بوش 25 لتر",
        subTitle: "Serie 4 مع AutoPilot",
        description: [{ title: "نظرة عامة", content: "ميكروويف بوش بتقنية AutoPilot" }],
        specifications: [
          { key: "السعة", value: "25", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "900", unit: "واط", group: "الطاقة" },
        ],
        features: ["AutoPilot", "Popcorn Button", "Memory Function"],
        warranty: "ضمان سنة",
      },
      en: {
        title: "Bosch 25L Microwave Oven",
        subTitle: "Serie 4 with AutoPilot",
        description: [{ title: "Overview", content: "Bosch microwave with AutoPilot" }],
        specifications: [
          { key: "Capacity", value: "25", unit: "L", group: "Capacity" },
          { key: "Power", value: "900", unit: "W", group: "Power" },
        ],
        features: ["AutoPilot", "Popcorn Button", "Memory Function"],
        warranty: "1-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&h=800&fit=crop&hue=20" }],
      sku: "BOSCH-BFL524MS0",
      modelNumber: "BFL524MS0",
      category: microwavesCategory._id,
      brand: boschBrand._id,
      price: 720,
      discountPrice: 80,
      stock: 55,
      status: "active",
      sizeType: "small",
      tags: ["recommended"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ميكروويف باناسونيك 32 لتر إنفيرتر",
        subTitle: "Inverter Turbo Defrost",
        description: [{ title: "نظرة عامة", content: "ميكروويف باناسونيك بإنفيرتر" }],
        specifications: [
          { key: "السعة", value: "32", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "1000", unit: "واط", group: "الطاقة" },
        ],
        features: ["Inverter Technology", "Turbo Defrost", "Genius Sensor"],
        warranty: "ضمان سنة",
      },
      en: {
        title: "Panasonic 32L Inverter Microwave",
        subTitle: "Inverter Turbo Defrost",
        description: [{ title: "Overview", content: "Panasonic microwave with inverter" }],
        specifications: [
          { key: "Capacity", value: "32", unit: "L", group: "Capacity" },
          { key: "Power", value: "1000", unit: "W", group: "Power" },
        ],
        features: ["Inverter Technology", "Turbo Defrost", "Genius Sensor"],
        warranty: "1-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&h=800&fit=crop&bright=10" }],
      sku: "PANA-NNCF770M",
      modelNumber: "NNCF770M",
      category: microwavesCategory._id,
      brand: panasonicBrand._id,
      price: 820,
      discountPrice: 90,
      stock: 50,
      status: "active",
      sizeType: "small",
      tags: ["eco_friendly"],
      currencyCode: "SAR",
    },

    // SMALL APPLIANCES - Kettles (4 products)
    {
      ar: {
        title: "غلاية فيليبس 1.7 لتر",
        subTitle: "غلاية كهربائية من الاستانلس ستيل",
        description: [{ title: "نظرة عامة", content: "غلاية فيليبس سريعة الغليان" }],
        specifications: [
          { key: "السعة", value: "1.7", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "2200", unit: "واط", group: "الطاقة" },
        ],
        features: ["Stainless Steel", "Auto Shut-off", "Boil-dry Protection"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Philips 1.7L Electric Kettle",
        subTitle: "Stainless Steel Kettle",
        description: [{ title: "Overview", content: "Philips fast-boiling kettle" }],
        specifications: [
          { key: "Capacity", value: "1.7", unit: "L", group: "Capacity" },
          { key: "Power", value: "2200", unit: "W", group: "Power" },
        ],
        features: ["Stainless Steel", "Auto Shut-off", "Boil-dry Protection"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&h=800&fit=crop" }],
      sku: "PHIL-HD9350",
      modelNumber: "HD9350",
      category: kettlesCategory._id,
      brand: philipsBrand._id,
      price: 180,
      discountPrice: 20,
      stock: 100,
      status: "active",
      sizeType: "small",
      tags: ["best_seller"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غلاية بوش 1.5 لتر",
        subTitle: "StyleLine مع كونترول الحرارة",
        description: [{ title: "نظرة عامة", content: "غلاية بوش بالتحكم بدرجة الحرارة" }],
        specifications: [
          { key: "السعة", value: "1.5", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "2400", unit: "واط", group: "الطاقة" },
        ],
        features: ["Temperature Control", "Keep Warm", "Limescale Filter"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 1.5L Electric Kettle",
        subTitle: "StyleLine with Temperature Control",
        description: [{ title: "Overview", content: "Bosch kettle with temperature control" }],
        specifications: [
          { key: "Capacity", value: "1.5", unit: "L", group: "Capacity" },
          { key: "Power", value: "2400", unit: "W", group: "Power" },
        ],
        features: ["Temperature Control", "Keep Warm", "Limescale Filter"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&h=800&fit=crop&sat=-30" }],
      sku: "BOSCH-TWK8613P",
      modelNumber: "TWK8613P",
      category: kettlesCategory._id,
      brand: boschBrand._id,
      price: 320,
      discountPrice: 40,
      stock: 80,
      status: "active",
      sizeType: "small",
      tags: ["featured"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غلاية براون 1.7 لتر",
        subTitle: "MultiQuick مع سخان سريع",
        description: [{ title: "نظرة عامة", content: "غلاية براون بسخان سريع" }],
        specifications: [
          { key: "السعة", value: "1.7", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "2200", unit: "واط", group: "الطاقة" },
        ],
        features: ["Rapid Boil", "360° Base", "Water Level Indicator"],
        warranty: "ضمان سنة",
      },
      en: {
        title: "Braun 1.7L Electric Kettle",
        subTitle: "MultiQuick with Rapid Boil",
        description: [{ title: "Overview", content: "Braun kettle with rapid boil" }],
        specifications: [
          { key: "Capacity", value: "1.7", unit: "L", group: "Capacity" },
          { key: "Power", value: "2200", unit: "W", group: "Power" },
        ],
        features: ["Rapid Boil", "360° Base", "Water Level Indicator"],
        warranty: "1-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&h=800&fit=crop&hue=20" }],
      sku: "BRAUN-WK3110",
      modelNumber: "WK3110",
      category: kettlesCategory._id,
      brand: braunBrand._id,
      price: 220,
      discountPrice: 25,
      stock: 90,
      status: "active",
      sizeType: "small",
      tags: ["recommended"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غلاية كينوود 1.6 لتر",
        subTitle: "Persona مع LED Illumination",
        description: [{ title: "نظرة عامة", content: "غلاية كينوود بإضاءة LED" }],
        specifications: [
          { key: "السعة", value: "1.6", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "2200", unit: "واط", group: "الطاقة" },
        ],
        features: ["LED Illumination", "Concealed Element", "Cord Storage"],
        warranty: "ضمان سنة",
      },
      en: {
        title: "Kenwood 1.6L Electric Kettle",
        subTitle: "Persona with LED Illumination",
        description: [{ title: "Overview", content: "Kenwood kettle with LED illumination" }],
        specifications: [
          { key: "Capacity", value: "1.6", unit: "L", group: "Capacity" },
          { key: "Power", value: "2200", unit: "W", group: "Power" },
        ],
        features: ["LED Illumination", "Concealed Element", "Cord Storage"],
        warranty: "1-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&h=800&fit=crop&bright=10" }],
      sku: "KENW-SJM470",
      modelNumber: "SJM470",
      category: kettlesCategory._id,
      brand: kenwoodBrand._id,
      price: 250,
      discountPrice: 30,
      stock: 85,
      status: "active",
      sizeType: "small",
      tags: ["trending"],
      currencyCode: "SAR",
    },

    // SMALL APPLIANCES - Coffee Makers (3 products)
    {
      ar: {
        title: "ماكينة قهوة فيليبس سبريسو 1.8 لتر",
        subTitle: "LatteGo مع AquaClean",
        description: [{ title: "نظرة عامة", content: "ماكينة قهوة فيليبس أوتوماتيكية" }],
        specifications: [
          { key: "السعة", value: "1.8", unit: "لتر", group: "السعة" },
          { key: "الضغط", value: "15", unit: "بار", group: "الأداء" },
        ],
        features: ["LatteGo Milk System", "AquaClean Filter", "12 Drinks"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Philips 1.8L Espresso Machine",
        subTitle: "LatteGo with AquaClean",
        description: [{ title: "Overview", content: "Philips automatic coffee machine" }],
        specifications: [
          { key: "Capacity", value: "1.8", unit: "L", group: "Capacity" },
          { key: "Pressure", value: "15", unit: "bar", group: "Performance" },
        ],
        features: ["LatteGo Milk System", "AquaClean Filter", "12 Drinks"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&h=800&fit=crop" }],
      sku: "PHIL-EP2235",
      modelNumber: "EP2235",
      category: coffeeMakersCategory._id,
      brand: philipsBrand._id,
      price: 2800,
      discountPrice: 350,
      stock: 35,
      status: "active",
      sizeType: "small",
      tags: ["best_seller", "featured"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ماكينة قهوة بوش 1.4 لتر",
        subTitle: "Tassimo مع IntensityBoost",
        description: [{ title: "نظرة عامة", content: "ماكينة قهوة بوش بنظام كبسولات" }],
        specifications: [
          { key: "السعة", value: "1.4", unit: "لتر", group: "السعة" },
          { key: "القوة", value: "1300", unit: "واط", group: "الطاقة" },
        ],
        features: ["IntensityBoost", "Brita Filter", "Auto Off"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 1.4L Coffee Machine",
        subTitle: "Tassimo with IntensityBoost",
        description: [{ title: "Overview", content: "Bosch pod coffee machine" }],
        specifications: [
          { key: "Capacity", value: "1.4", unit: "L", group: "Capacity" },
          { key: "Power", value: "1300", unit: "W", group: "Power" },
        ],
        features: ["IntensityBoost", "Brita Filter", "Auto Off"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&h=800&fit=crop&sat=-30" }],
      sku: "BOSCH-TAS6504",
      modelNumber: "TAS6504",
      category: coffeeMakersCategory._id,
      brand: boschBrand._id,
      price: 980,
      discountPrice: 120,
      stock: 50,
      status: "active",
      sizeType: "small",
      tags: ["recommended"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "ماكينة قهوة براون 1.25 لتر",
        subTitle: "PurAroma مع OptiBrewSystem",
        description: [{ title: "نظرة عامة", content: "ماكينة قهوة براون بنظام OptiBrewSystem" }],
        specifications: [
          { key: "السعة", value: "1.25", unit: "لتر", group: "السعة" },
          { key: "عدد الأكواب", value: "10", unit: "كوب", group: "السعة" },
        ],
        features: ["OptiBrewSystem", "Anti-Drip System", "Keep Warm"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Braun 1.25L Coffee Maker",
        subTitle: "PurAroma with OptiBrewSystem",
        description: [{ title: "Overview", content: "Braun coffee maker with OptiBrewSystem" }],
        specifications: [
          { key: "Capacity", value: "1.25", unit: "L", group: "Capacity" },
          { key: "Cups", value: "10", unit: "cups", group: "Capacity" },
        ],
        features: ["OptiBrewSystem", "Anti-Drip System", "Keep Warm"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&h=800&fit=crop&hue=20" }],
      sku: "BRAUN-KF5120",
      modelNumber: "KF5120",
      category: coffeeMakersCategory._id,
      brand: braunBrand._id,
      price: 450,
      discountPrice: 50,
      stock: 65,
      status: "active",
      sizeType: "small",
      tags: ["trending"],
      currencyCode: "SAR",
    },

    // SMALL APPLIANCES - Blenders (3 products)
    {
      ar: {
        title: "خلاط فيليبس 900 واط",
        subTitle: "ProBlend 6 مع تقنية 3D",
        description: [{ title: "نظرة عامة", content: "خلاط فيليبس قوي بتقنية 3D" }],
        specifications: [
          { key: "القوة", value: "900", unit: "واط", group: "الطاقة" },
          { key: "السعة", value: "2", unit: "لتر", group: "السعة" },
        ],
        features: ["ProBlend 6", "3D Technology", "Ice Crush"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Philips 900W Blender",
        subTitle: "ProBlend 6 with 3D Technology",
        description: [{ title: "Overview", content: "Philips powerful blender with 3D technology" }],
        specifications: [
          { key: "Power", value: "900", unit: "W", group: "Power" },
          { key: "Capacity", value: "2", unit: "L", group: "Capacity" },
        ],
        features: ["ProBlend 6", "3D Technology", "Ice Crush"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&h=800&fit=crop" }],
      sku: "PHIL-HR2223",
      modelNumber: "HR2223",
      category: blendersCategory._id,
      brand: philipsBrand._id,
      price: 420,
      discountPrice: 50,
      stock: 75,
      status: "active",
      sizeType: "small",
      tags: ["best_seller"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "خلاط براون 1000 واط",
        subTitle: "JB5160 مع TriAction Technology",
        description: [{ title: "نظرة عامة", content: "خلاط براون بتقنية TriAction" }],
        specifications: [
          { key: "القوة", value: "1000", unit: "واط", group: "الطاقة" },
          { key: "السعة", value: "1.75", unit: "لتر", group: "السعة" },
        ],
        features: ["TriAction Technology", "Ice Crusher", "Pulse Function"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Braun 1000W Blender",
        subTitle: "JB5160 with TriAction Technology",
        description: [{ title: "Overview", content: "Braun blender with TriAction technology" }],
        specifications: [
          { key: "Power", value: "1000", unit: "W", group: "Power" },
          { key: "Capacity", value: "1.75", unit: "L", group: "Capacity" },
        ],
        features: ["TriAction Technology", "Ice Crusher", "Pulse Function"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&h=800&fit=crop&sat=-30" }],
      sku: "BRAUN-JB5160",
      modelNumber: "JB5160",
      category: blendersCategory._id,
      brand: braunBrand._id,
      price: 480,
      discountPrice: 60,
      stock: 70,
      status: "active",
      sizeType: "small",
      tags: ["featured"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "خلاط كينوود 800 واط",
        subTitle: "Blend-X مع نظام ThermoResist",
        description: [{ title: "نظرة عامة", content: "خلاط كينوود بنظام ThermoResist" }],
        specifications: [
          { key: "القوة", value: "800", unit: "واط", group: "الطاقة" },
          { key: "السعة", value: "2", unit: "لتر", group: "السعة" },
        ],
        features: ["ThermoResist", "Smoothie Mode", "Easy Clean"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Kenwood 800W Blender",
        subTitle: "Blend-X with ThermoResist",
        description: [{ title: "Overview", content: "Kenwood blender with ThermoResist" }],
        specifications: [
          { key: "Power", value: "800", unit: "W", group: "Power" },
          { key: "Capacity", value: "2", unit: "L", group: "Capacity" },
        ],
        features: ["ThermoResist", "Smoothie Mode", "Easy Clean"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&h=800&fit=crop&hue=20" }],
      sku: "KENW-BLP31",
      modelNumber: "BLP31",
      category: blendersCategory._id,
      brand: kenwoodBrand._id,
      price: 380,
      discountPrice: 45,
      stock: 80,
      status: "active",
      sizeType: "small",
      tags: ["recommended"],
      currencyCode: "SAR",
    },

    // SMALL APPLIANCES - Toasters (2 products)
    {
      ar: {
        title: "محمصة خبز فيليبس شريحتين",
        subTitle: "Daily Collection مع 8 إعدادات",
        description: [{ title: "نظرة عامة", content: "محمصة فيليبس لشريحتين" }],
        specifications: [
          { key: "عدد الشرائح", value: "2", unit: "شريحة", group: "السعة" },
          { key: "القوة", value: "830", unit: "واط", group: "الطاقة" },
        ],
        features: ["8 Browning Settings", "Defrost Function", "Removable Crumb Tray"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Philips 2-Slice Toaster",
        subTitle: "Daily Collection with 8 Settings",
        description: [{ title: "Overview", content: "Philips 2-slice toaster" }],
        specifications: [
          { key: "Slices", value: "2", unit: "slices", group: "Capacity" },
          { key: "Power", value: "830", unit: "W", group: "Power" },
        ],
        features: ["8 Browning Settings", "Defrost Function", "Removable Crumb Tray"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1550963295-019d8a8a61c5?w=800&h=800&fit=crop" }],
      sku: "PHIL-HD2582",
      modelNumber: "HD2582",
      category: toastersCategory._id,
      brand: philipsBrand._id,
      price: 180,
      discountPrice: 20,
      stock: 95,
      status: "active",
      sizeType: "small",
      tags: ["best_seller"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "محمصة خبز بوش أربع شرائح",
        subTitle: "ComfortLine مع QuickToast",
        description: [{ title: "نظرة عامة", content: "محمصة بوش لأربع شرائح" }],
        specifications: [
          { key: "عدد الشرائح", value: "4", unit: "شريحة", group: "السعة" },
          { key: "القوة", value: "1800", unit: "واط", group: "الطاقة" },
        ],
        features: ["QuickToast", "Auto Shutoff", "Integrated Bun Warmer"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 4-Slice Toaster",
        subTitle: "ComfortLine with QuickToast",
        description: [{ title: "Overview", content: "Bosch 4-slice toaster" }],
        specifications: [
          { key: "Slices", value: "4", unit: "slices", group: "Capacity" },
          { key: "Power", value: "1800", unit: "W", group: "Power" },
        ],
        features: ["QuickToast", "Auto Shutoff", "Integrated Bun Warmer"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1550963295-019d8a8a61c5?w=800&h=800&fit=crop&sat=-30" }],
      sku: "BOSCH-TAT6A114",
      modelNumber: "TAT6A114",
      category: toastersCategory._id,
      brand: boschBrand._id,
      price: 350,
      discountPrice: 40,
      stock: 70,
      status: "active",
      sizeType: "small",
      tags: ["featured"],
      currencyCode: "SAR",
    },

    // SMALL APPLIANCES - Irons (3 products)
    {
      ar: {
        title: "مكواة فيليبس بخار 2400 واط",
        subTitle: "Azur مع تقنية SteamGlide",
        description: [{ title: "نظرة عامة", content: "مكواة فيليبس بتقنية SteamGlide" }],
        specifications: [
          { key: "القوة", value: "2400", unit: "واط", group: "الطاقة" },
          { key: "ضغط البخار", value: "45", unit: "جم/دقيقة", group: "البخار" },
        ],
        features: ["SteamGlide", "Calc Clean", "Auto Shutoff"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Philips 2400W Steam Iron",
        subTitle: "Azur with SteamGlide",
        description: [{ title: "Overview", content: "Philips iron with SteamGlide technology" }],
        specifications: [
          { key: "Power", value: "2400", unit: "W", group: "Power" },
          { key: "Steam Rate", value: "45", unit: "g/min", group: "Steam" },
        ],
        features: ["SteamGlide", "Calc Clean", "Auto Shutoff"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1582735689115-3bfac2eb6318?w=800&h=800&fit=crop" }],
      sku: "PHIL-GC4567",
      modelNumber: "GC4567",
      category: ironsCategory._id,
      brand: philipsBrand._id,
      price: 280,
      discountPrice: 35,
      stock: 85,
      status: "active",
      sizeType: "small",
      tags: ["best_seller"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكواة بوش 2800 واط",
        subTitle: "Sensixx مع CeraniumGlissée",
        description: [{ title: "نظرة عامة", content: "مكواة بوش قوية ومتينة" }],
        specifications: [
          { key: "القوة", value: "2800", unit: "واط", group: "الطاقة" },
          { key: "ضغط البخار", value: "50", unit: "جم/دقيقة", group: "البخار" },
        ],
        features: ["CeraniumGlissée", "Precision Tip", "Anti-Drip"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 2800W Steam Iron",
        subTitle: "Sensixx with CeraniumGlissée",
        description: [{ title: "Overview", content: "Bosch powerful and durable iron" }],
        specifications: [
          { key: "Power", value: "2800", unit: "W", group: "Power" },
          { key: "Steam Rate", value: "50", unit: "g/min", group: "Steam" },
        ],
        features: ["CeraniumGlissée", "Precision Tip", "Anti-Drip"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1582735689115-3bfac2eb6318?w=800&h=800&fit=crop&sat=-30" }],
      sku: "BOSCH-TDA503001",
      modelNumber: "TDA503001",
      category: ironsCategory._id,
      brand: boschBrand._id,
      price: 380,
      discountPrice: 45,
      stock: 75,
      status: "active",
      sizeType: "small",
      tags: ["featured"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكواة براون 2000 واط",
        subTitle: "TexStyle مع Eloxal Soleplate",
        description: [{ title: "نظرة عامة", content: "مكواة براون بقاعدة Eloxal" }],
        specifications: [
          { key: "القوة", value: "2000", unit: "واط", group: "الطاقة" },
          { key: "ضغط البخار", value: "40", unit: "جم/دقيقة", group: "البخار" },
        ],
        features: ["Eloxal Soleplate", "Spray Function", "Self-Cleaning"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Braun 2000W Steam Iron",
        subTitle: "TexStyle with Eloxal Soleplate",
        description: [{ title: "Overview", content: "Braun iron with Eloxal soleplate" }],
        specifications: [
          { key: "Power", value: "2000", unit: "W", group: "Power" },
          { key: "Steam Rate", value: "40", unit: "g/min", group: "Steam" },
        ],
        features: ["Eloxal Soleplate", "Spray Function", "Self-Cleaning"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1582735689115-3bfac2eb6318?w=800&h=800&fit=crop&hue=20" }],
      sku: "BRAUN-TS375",
      modelNumber: "TS375",
      category: ironsCategory._id,
      brand: braunBrand._id,
      price: 220,
      discountPrice: 25,
      stock: 90,
      status: "active",
      sizeType: "small",
      tags: ["recommended"],
      currencyCode: "SAR",
    },

    // SMALL APPLIANCES - Vacuum Cleaners (3 products)
    {
      ar: {
        title: "مكنسة فيليبس 2000 واط",
        subTitle: "PowerPro مع تقنية PowerCyclone",
        description: [{ title: "نظرة عامة", content: "مكنسة فيليبس قوية بدون كيس" }],
        specifications: [
          { key: "القوة", value: "2000", unit: "واط", group: "الطاقة" },
          { key: "السعة", value: "1.5", unit: "لتر", group: "السعة" },
        ],
        features: ["PowerCyclone", "Allergy Filter", "Turbo Brush"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Philips 2000W Vacuum Cleaner",
        subTitle: "PowerPro with PowerCyclone",
        description: [{ title: "Overview", content: "Philips powerful bagless vacuum" }],
        specifications: [
          { key: "Power", value: "2000", unit: "W", group: "Power" },
          { key: "Capacity", value: "1.5", unit: "L", group: "Capacity" },
        ],
        features: ["PowerCyclone", "Allergy Filter", "Turbo Brush"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&h=800&fit=crop" }],
      sku: "PHIL-FC9352",
      modelNumber: "FC9352",
      category: vacuumCleanersCategory._id,
      brand: philipsBrand._id,
      price: 680,
      discountPrice: 80,
      stock: 55,
      status: "active",
      sizeType: "small",
      tags: ["best_seller"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكنسة بوش 2200 واط",
        subTitle: "BGL35MOV14 مع تقنية SensorBagless",
        description: [{ title: "نظرة عامة", content: "مكنسة بوش بتقنية SensorBagless" }],
        specifications: [
          { key: "القوة", value: "2200", unit: "واط", group: "الطاقة" },
          { key: "السعة", value: "3", unit: "لتر", group: "السعة" },
        ],
        features: ["SensorBagless", "HEPA Filter", "Telescopic Tube"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 2200W Vacuum Cleaner",
        subTitle: "BGL35MOV14 with SensorBagless",
        description: [{ title: "Overview", content: "Bosch vacuum with SensorBagless technology" }],
        specifications: [
          { key: "Power", value: "2200", unit: "W", group: "Power" },
          { key: "Capacity", value: "3", unit: "L", group: "Capacity" },
        ],
        features: ["SensorBagless", "HEPA Filter", "Telescopic Tube"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&h=800&fit=crop&sat=-30" }],
      sku: "BOSCH-BGL35MOV14",
      modelNumber: "BGL35MOV14",
      category: vacuumCleanersCategory._id,
      brand: boschBrand._id,
      price: 850,
      discountPrice: 100,
      stock: 45,
      status: "active",
      sizeType: "small",
      tags: ["featured", "eco_friendly"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "مكنسة باناسونيك 1800 واط",
        subTitle: "MC-CL935 مع تقنية Eco Max",
        description: [{ title: "نظرة عامة", content: "مكنسة باناسونيك موفرة للطاقة" }],
        specifications: [
          { key: "القوة", value: "1800", unit: "واط", group: "الطاقة" },
          { key: "السعة", value: "2", unit: "لتر", group: "السعة" },
        ],
        features: ["Eco Max", "Nano-e Technology", "Lightweight"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Panasonic 1800W Vacuum Cleaner",
        subTitle: "MC-CL935 with Eco Max",
        description: [{ title: "Overview", content: "Panasonic energy-efficient vacuum" }],
        specifications: [
          { key: "Power", value: "1800", unit: "W", group: "Power" },
          { key: "Capacity", value: "2", unit: "L", group: "Capacity" },
        ],
        features: ["Eco Max", "Nano-e Technology", "Lightweight"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&h=800&fit=crop&hue=20" }],
      sku: "PANA-MCCL935",
      modelNumber: "MC-CL935",
      category: vacuumCleanersCategory._id,
      brand: panasonicBrand._id,
      price: 580,
      discountPrice: 65,
      stock: 60,
      status: "active",
      sizeType: "small",
      tags: ["eco_friendly", "recommended"],
      currencyCode: "SAR",
    },

    // OVENS (3 products)
    {
      ar: {
        title: "فرن بوش مدمج 71 لتر",
        subTitle: "Serie 8 مع تقنية 4D Hot Air",
        description: [{ title: "نظرة عامة", content: "فرن بوش فاخر بتقنية 4D Hot Air" }],
        specifications: [
          { key: "السعة", value: "71", unit: "لتر", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A+", unit: "", group: "الطاقة" },
        ],
        features: ["4D Hot Air", "Pyrolytic Cleaning", "Home Connect"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 71L Built-in Oven",
        subTitle: "Serie 8 with 4D Hot Air",
        description: [{ title: "Overview", content: "Bosch premium oven with 4D Hot Air" }],
        specifications: [
          { key: "Capacity", value: "71", unit: "L", group: "Capacity" },
          { key: "Energy Efficiency", value: "A+", unit: "", group: "Energy" },
        ],
        features: ["4D Hot Air", "Pyrolytic Cleaning", "Home Connect"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&h=800&fit=crop" }],
      sku: "BOSCH-HBG6764S1",
      modelNumber: "HBG6764S1",
      category: ovensCategory._id,
      brand: boschBrand._id,
      price: 5200,
      discountPrice: 650,
      stock: 18,
      status: "active",
      sizeType: "large",
      tags: ["exclusive", "top_rated"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "فرن سيمنز مدمج 67 لتر",
        subTitle: "iQ700 مع ActiveClean",
        description: [{ title: "نظرة عامة", content: "فرن سيمنز بتنظيف ذاتي" }],
        specifications: [
          { key: "السعة", value: "67", unit: "لتر", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A+", unit: "", group: "الطاقة" },
        ],
        features: ["ActiveClean", "coolStart", "Home Connect"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Siemens 67L Built-in Oven",
        subTitle: "iQ700 with ActiveClean",
        description: [{ title: "Overview", content: "Siemens oven with self-cleaning" }],
        specifications: [
          { key: "Capacity", value: "67", unit: "L", group: "Capacity" },
          { key: "Energy Efficiency", value: "A+", unit: "", group: "Energy" },
        ],
        features: ["ActiveClean", "coolStart", "Home Connect"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&h=800&fit=crop&sat=-30" }],
      sku: "SIEM-HB674GBS1",
      modelNumber: "HB674GBS1",
      category: ovensCategory._id,
      brand: siemensBrand._id,
      price: 6100,
      discountPrice: 750,
      stock: 15,
      status: "active",
      sizeType: "large",
      tags: ["exclusive", "featured"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "فرن إلكترولوكس مدمج 74 لتر",
        subTitle: "SteamBake مع تقنية البخار",
        description: [{ title: "نظرة عامة", content: "فرن إلكترولوكس بتقنية البخار" }],
        specifications: [
          { key: "السعة", value: "74", unit: "لتر", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A", unit: "", group: "الطاقة" },
        ],
        features: ["SteamBake", "SurroundCook", "Pyrolytic Cleaning"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Electrolux 74L Built-in Oven",
        subTitle: "SteamBake with Steam Technology",
        description: [{ title: "Overview", content: "Electrolux oven with steam technology" }],
        specifications: [
          { key: "Capacity", value: "74", unit: "L", group: "Capacity" },
          { key: "Energy Efficiency", value: "A", unit: "", group: "Energy" },
        ],
        features: ["SteamBake", "SurroundCook", "Pyrolytic Cleaning"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&h=800&fit=crop&hue=20" }],
      sku: "ELEC-EOB9S31WX",
      modelNumber: "EOB9S31WX",
      category: ovensCategory._id,
      brand: electroluxBrand._id,
      price: 4800,
      discountPrice: 580,
      stock: 20,
      status: "active",
      sizeType: "large",
      tags: ["recommended"],
      currencyCode: "SAR",
    },

    // DISHWASHERS (3 products)
    {
      ar: {
        title: "غسالة صحون بوش 13 مكان",
        subTitle: "Serie 6 مع تقنية PerfectDry",
        description: [{ title: "نظرة عامة", content: "غسالة صحون بوش بسعة 13 مكان" }],
        specifications: [
          { key: "السعة", value: "13", unit: "مكان", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["PerfectDry", "VarioSpeed Plus", "Home Connect"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Bosch 13 Place Dishwasher",
        subTitle: "Serie 6 with PerfectDry",
        description: [{ title: "Overview", content: "Bosch dishwasher with 13 place settings" }],
        specifications: [
          { key: "Capacity", value: "13", unit: "place", group: "Capacity" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["PerfectDry", "VarioSpeed Plus", "Home Connect"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=800&fit=crop" }],
      sku: "BOSCH-SMS6ZCI48E",
      modelNumber: "SMS6ZCI48E",
      category: dishwashersCategory._id,
      brand: boschBrand._id,
      price: 3800,
      discountPrice: 450,
      stock: 25,
      status: "active",
      sizeType: "large",
      tags: ["best_seller", "top_rated"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة صحون سيمنز 14 مكان",
        subTitle: "iQ500 مع تقنية varioSpeed Plus",
        description: [{ title: "نظرة عامة", content: "غسالة صحون سيمنز بسعة 14 مكان" }],
        specifications: [
          { key: "السعة", value: "14", unit: "مكان", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["varioSpeed Plus", "iQdrive", "Home Connect"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Siemens 14 Place Dishwasher",
        subTitle: "iQ500 with varioSpeed Plus",
        description: [{ title: "Overview", content: "Siemens dishwasher with 14 place settings" }],
        specifications: [
          { key: "Capacity", value: "14", unit: "place", group: "Capacity" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["varioSpeed Plus", "iQdrive", "Home Connect"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=800&fit=crop&sat=-30" }],
      sku: "SIEM-SN65ZX49CE",
      modelNumber: "SN65ZX49CE",
      category: dishwashersCategory._id,
      brand: siemensBrand._id,
      price: 4500,
      discountPrice: 550,
      stock: 20,
      status: "active",
      sizeType: "large",
      tags: ["exclusive", "featured"],
      currencyCode: "SAR",
    },
    {
      ar: {
        title: "غسالة صحون إلكترولوكس 13 مكان",
        subTitle: "ComfortLift مع AirDry",
        description: [{ title: "نظرة عامة", content: "غسالة صحون إلكترولوكس بتقنية ComfortLift" }],
        specifications: [
          { key: "السعة", value: "13", unit: "مكان", group: "السعة" },
          { key: "كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
        ],
        features: ["ComfortLift", "AirDry", "QuickSelect"],
        warranty: "ضمان سنتين",
      },
      en: {
        title: "Electrolux 13 Place Dishwasher",
        subTitle: "ComfortLift with AirDry",
        description: [{ title: "Overview", content: "Electrolux dishwasher with ComfortLift technology" }],
        specifications: [
          { key: "Capacity", value: "13", unit: "place", group: "Capacity" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
        ],
        features: ["ComfortLift", "AirDry", "QuickSelect"],
        warranty: "2-year warranty",
      },
      images: [{ url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=800&fit=crop&hue=20" }],
      sku: "ELEC-ESF9516LOW",
      modelNumber: "ESF9516LOW",
      category: dishwashersCategory._id,
      brand: electroluxBrand._id,
      price: 3200,
      discountPrice: 380,
      stock: 28,
      status: "active",
      sizeType: "large",
      tags: ["recommended"],
      currencyCode: "SAR",
    },
  ];

  // Insert products with existence check
  for (const product of products) {
    try {
      const existing = await Product.findOne({ sku: product.sku });
      if (!existing) {
        await Product.create(product);
        console.log(`✓ Created product: ${product.en.title} (${product.sku})`);
      } else {
        console.log(`⊗ Product already exists: ${product.sku}`);
      }
    } catch (error) {
      console.error(`✗ Error creating product ${product.sku}:`, error.message);
    }
  }
  
};
export const recalcAllCategoryCounts = async () => {
  const categories = await Category.find();

  for (const cat of categories) {
    const count = await Product.countDocuments({ category: cat._id });

    await Category.findByIdAndUpdate(cat._id, { productCount: count });
  }

  console.log("✓ Recalculated all category product counts");
};

/* --------------------------------------------------
   SEED ROLES
--------------------------------------------------- */
const seedRoles = async () => {
  const roles = [
    {
      name: "superAdmin",
      displayName: {
        en: "Super Administrator",
        ar: "مدير عام",
      },
      description: {
        en: "Full system access with all permissions",
        ar: "وصول كامل للنظام مع جميع الصلاحيات",
      },
      isSystemRole: true,
      isActive: true,
      priority: 100,
      permissions: [
        {
          resource: "users",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "products",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "categories",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "brands",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "orders",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "reviews",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "coupons",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "catalogs",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "home",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "branches",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "cart",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "analytics",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "roles",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "settings",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
      ],
    },
    {
      name: "admin",
      displayName: {
        en: "Administrator",
        ar: "مدير",
      },
      description: {
        en: "Admin with elevated permissions",
        ar: "مدير مع صلاحيات مرتفعة",
      },
      isSystemRole: true,
      isActive: true,
      priority: 80,
      permissions: [
        {
          resource: "users",
          actions: { create: true, read: true, update: true, delete: false, export: true, import: false },
        },
        {
          resource: "products",
          actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
        },
        {
          resource: "categories",
          actions: { create: true, read: true, update: true, delete: true, export: false, import: false },
        },
        {
          resource: "brands",
          actions: { create: true, read: true, update: true, delete: true, export: false, import: false },
        },
        {
          resource: "orders",
          actions: { create: true, read: true, update: true, delete: false, export: true, import: false },
        },
        {
          resource: "reviews",
          actions: { create: false, read: true, update: true, delete: true, export: false, import: false },
        },
        {
          resource: "coupons",
          actions: { create: true, read: true, update: true, delete: true, export: false, import: false },
        },
        {
          resource: "catalogs",
          actions: { create: true, read: true, update: true, delete: true, export: false, import: false },
        },
        {
          resource: "home",
          actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "branches",
          actions: { create: true, read: true, update: true, delete: true, export: false, import: false },
        },
        {
          resource: "cart",
          actions: { create: false, read: true, update: true, delete: true, export: false, import: false },
        },
        {
          resource: "analytics",
          actions: { create: false, read: true, update: false, delete: false, export: true, import: false },
        },
        {
          resource: "roles",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "settings",
          actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
        },
      ],
    },
    {
      name: "manager",
      displayName: {
        en: "Manager",
        ar: "مشرف",
      },
      description: {
        en: "Manager with limited admin permissions",
        ar: "مشرف مع صلاحيات إدارية محدودة",
      },
      isSystemRole: true,
      isActive: true,
      priority: 60,
      permissions: [
        {
          resource: "users",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "products",
          actions: { create: true, read: true, update: true, delete: false, export: true, import: false },
        },
        {
          resource: "categories",
          actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "brands",
          actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "orders",
          actions: { create: false, read: true, update: true, delete: false, export: true, import: false },
        },
        {
          resource: "reviews",
          actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "coupons",
          actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "catalogs",
          actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "home",
          actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "branches",
          actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "cart",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "analytics",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "roles",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "settings",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
      ],
    },
    {
      name: "user",
      displayName: {
        en: "User",
        ar: "مستخدم",
      },
      description: {
        en: "Regular user with basic permissions",
        ar: "مستخدم عادي مع صلاحيات أساسية",
      },
      isSystemRole: true,
      isActive: true,
      priority: 10,
      permissions: [
        {
          resource: "users",
          actions: { create: false, read: false, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "products",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "categories",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "brands",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "orders",
          actions: { create: true, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "reviews",
          actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
        },
        {
          resource: "coupons",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "catalogs",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "home",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "branches",
          actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "cart",
          actions: { create: true, read: true, update: true, delete: true, export: false, import: false },
        },
        {
          resource: "analytics",
          actions: { create: false, read: false, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "roles",
          actions: { create: false, read: false, update: false, delete: false, export: false, import: false },
        },
        {
          resource: "settings",
          actions: { create: false, read: false, update: false, delete: false, export: false, import: false },
        },
      ],
    },
  ];

  for (const roleData of roles) {
    try {
      const existing = await Role.findOne({ name: roleData.name });
      if (!existing) {
        await Role.create(roleData);
        console.log(`✓ Created role: ${roleData.displayName.en} (${roleData.name})`);
      } else {
        console.log(`⊗ Role already exists: ${roleData.name}`);
      }
    } catch (error) {
      console.error(`✗ Error creating role ${roleData.name}:`, error.message);
    }
  }
};

/* --------------------------------------------------
   SEED USERS (Including Super Admin)
--------------------------------------------------- */
const seedUsers = async () => {
  // First ensure roles exist
  const superAdminRole = await Role.findOne({ name: "superAdmin" });
  const adminRole = await Role.findOne({ name: "admin" });
  const managerRole = await Role.findOne({ name: "manager" });
  const userRole = await Role.findOne({ name: "user" });

  if (!superAdminRole || !adminRole || !managerRole || !userRole) {
    console.error("✗ Roles must be seeded before users. Run seedRoles first.");
    return;
  }

  const users = [
    {
      name: "Super Admin",
      email: "superadmin@elba.com",
      password: "SuperAdmin@123",
      phone: "+966500000001",
      gender: "male",
      address: "Riyadh",
      role: superAdminRole._id,
      legacyRole: "superAdmin",
      isActive: true,
      passwordVerified: true,
      preferences: {
        language: "en",
        notifications: true,
        emailNotifications: true,
      },
    },
    {
      name: "Admin User",
      email: "admin@elba.com",
      password: "Admin@123",
      phone: "+966500000002",
      gender: "male",
      address: "Jeddah",
      role: adminRole._id,
      legacyRole: "admin",
      isActive: true,
      passwordVerified: true,
      preferences: {
        language: "en",
        notifications: true,
        emailNotifications: true,
      },
    },
    {
      name: "Manager User",
      email: "manager@elba.com",
      password: "Manager@123",
      phone: "+966500000003",
      gender: "female",
      address: "Dammam",
      role: managerRole._id,
      legacyRole: "manager",
      isActive: true,
      passwordVerified: true,
      preferences: {
        language: "ar",
        notifications: true,
        emailNotifications: true,
      },
    },
    {
      name: "Test User",
      email: "user@elba.com",
      password: "User@123",
      phone: "+966500000004",
      gender: "male",
      address: "Riyadh",
      role: userRole._id,
      legacyRole: "user",
      isActive: true,
      passwordVerified: true,
      preferences: {
        language: "ar",
        notifications: true,
        emailNotifications: true,
      },
    },
    {
      name: "Ahmed Al-Mutairi",
      email: "ahmed.mutairi@example.com",
      password: "Password@123",
      phone: "+966500000005",
      gender: "male",
      dateOfBirth: new Date("1990-05-15"),
      address: "Makkah",
      role: userRole._id,
      legacyRole: "user",
      isActive: true,
      passwordVerified: true,
      preferences: {
        language: "ar",
        notifications: true,
        emailNotifications: false,
      },
    },
    {
      name: "Fatima Al-Qahtani",
      email: "fatima.qahtani@example.com",
      password: "Password@123",
      phone: "+966500000006",
      gender: "female",
      dateOfBirth: new Date("1995-08-22"),
      address: "Medina",
      role: userRole._id,
      legacyRole: "user",
      isActive: true,
      passwordVerified: true,
      preferences: {
        language: "ar",
        notifications: true,
        emailNotifications: true,
      },
    },
  ];

  for (const userData of users) {
    try {
      const existingEmail = await User.findOne({ email: userData.email });
      const existingPhone = await User.findOne({ phone: userData.phone });

      if (!existingEmail && !existingPhone) {
        await User.create(userData);
        console.log(`✓ Created user: ${userData.name} (${userData.email}) - Role: ${userData.legacyRole}`);
      } else if (existingEmail) {
        console.log(`⊗ User already exists with email: ${userData.email}`);
      } else if (existingPhone) {
        console.log(`⊗ User already exists with phone: ${userData.phone}`);
      }
    } catch (error) {
      console.error(`✗ Error creating user ${userData.email}:`, error.message);
    }
  }
};

/* --------------------------------------------------
   MAIN SEEDER
--------------------------------------------------- */
const runSeeder = async () => {
  try {
    console.log("🌱 Starting database seeder...\n");

    await seedRoles();
    console.log("\n");

    await seedUsers();
    console.log("\n");

    await seedCategories();
    console.log("\n");

    await seedBrands();
    console.log("\n");

    await seedProducts();
    console.log("\n");
    await recalcCategoryProductCounts();
    console.log("\n");
    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
};

export default runSeeder;
