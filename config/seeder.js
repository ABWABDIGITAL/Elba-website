import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
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
    },
    {
      en: { name: "Washing Machines", slug: "washing-machines" },
      ar: { name: "غسالات", slug: "washing-machines" },
      image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=300&fit=crop",
      isActive: true,
    },
    {
      en: { name: "Air Conditioners", slug: "air-conditioners" },
      ar: { name: "مكيفات", slug: "air-conditioners" },
      image: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=400&h=300&fit=crop",
      isActive: true,
    },
    {
      en: { name: "Ovens", slug: "ovens" },
      ar: { name: "أفران", slug: "ovens" },
      image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&h=300&fit=crop",
      isActive: true,
    },
    {
      en: { name: "Dishwashers", slug: "dishwashers" },
      ar: { name: "غسالات صحون", slug: "dishwashers" },
      image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop",
      isActive: true,
    },
    {
      en: { name: "Microwaves", slug: "microwaves" },
      ar: { name: "ميكروويف", slug: "microwaves" },
      image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400&h=300&fit=crop",
      isActive: true,
    },
    {
      en: { name: "Small Appliances", slug: "small-appliances" },
      ar: { name: "أجهزة صغيرة", slug: "small-appliances" },
      image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=300&fit=crop",
      isActive: true,
    },
  ];

  for (const cat of categories) {
    const existing = await Category.findOne({ "en.slug": cat.en.slug });
    if (!existing) {
      await Category.create(cat);
      console.log(`✓ Created category: ${cat.en.name}`);
    }
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
      en: { name: "Toshiba", slug: "toshiba" },
      ar: { name: "توشيبا", slug: "toshiba" },
      logo: "https://logo.clearbit.com/toshiba.com",
      isActive: true,
    },
    {
      en: { name: "General Electric", slug: "general-electric" },
      ar: { name: "جنرال إلكتريك", slug: "general-electric" },
      logo: "https://logo.clearbit.com/ge.com",
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
   SEED PRODUCTS
--------------------------------------------------- */
const seedProducts = async () => {
  const categories = await Category.find().lean();
  const brands = await Brand.find().lean();

  if (categories.length === 0 || brands.length === 0) {
    console.log("⚠ Cannot seed products: Categories or brands not found");
    return;
  }

  const refrigeratorsCategory = categories.find(c => c.en.slug === "refrigerators");
  const washingMachinesCategory = categories.find(c => c.en.slug === "washing-machines");
  const airConditionersCategory = categories.find(c => c.en.slug === "air-conditioners");
  const ovensCategory = categories.find(c => c.en.slug === "ovens");
  const dishwashersCategory = categories.find(c => c.en.slug === "dishwashers");
  const microwavesCategory = categories.find(c => c.en.slug === "microwaves");
  const smallAppliancesCategory = categories.find(c => c.en.slug === "small-appliances");

  const samsungBrand = brands.find(b => b.en.slug === "samsung");
  const lgBrand = brands.find(b => b.en.slug === "lg");
  const boschBrand = brands.find(b => b.en.slug === "bosch");
  const whirlpoolBrand = brands.find(b => b.en.slug === "whirlpool");
  const siemensBrand = brands.find(b => b.en.slug === "siemens");

  const products = [
    // 1. Samsung French Door Refrigerator
    {
      ar: {
        title: "ثلاجة سامسونج فرنش دور 18 قدم مكعب",
        subTitle: "تقنية التبريد المزدوج مع موزع ماء وثلج",
        description: [
          {
            title: "نظرة عامة",
            content: "ثلاجة سامسونج الفاخرة بتصميم الأبواب الفرنسية توفر سعة 18 قدم مكعب مع تقنية Twin Cooling Plus™ المبتكرة التي تحافظ على نضارة الطعام لفترة أطول. تأتي مع موزع ماء وثلج خارجي وأرفف قابلة للتعديل.",
          },
          {
            title: "المميزات الرئيسية",
            content: "تتميز بنظام تبريد مزدوج منفصل للثلاجة والفريزر، إضاءة LED داخلية موفرة للطاقة، درج للخضروات مع التحكم في الرطوبة، وتصميم عصري من الفولاذ المقاوم للصدأ.",
          },
        ],
        specifications: [
          { key: "السعة الإجمالية", value: "18", unit: "قدم مكعب", group: "السعة" },
          { key: "سعة الثلاجة", value: "12.4", unit: "قدم مكعب", group: "السعة" },
          { key: "سعة الفريزر", value: "5.6", unit: "قدم مكعب", group: "السعة" },
          { key: "استهلاك الطاقة السنوي", value: "540", unit: "كيلو واط ساعة", group: "الطاقة" },
          { key: "فئة كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
          { key: "مستوى الضوضاء", value: "39", unit: "ديسيبل", group: "الأداء" },
          { key: "نوع نظام التبريد", value: "No Frost", unit: "", group: "التبريد" },
          { key: "العرض", value: "90", unit: "سم", group: "الأبعاد" },
          { key: "الارتفاع", value: "178", unit: "سم", group: "الأبعاد" },
          { key: "العمق", value: "73", unit: "سم", group: "الأبعاد" },
          { key: "الوزن", value: "95", unit: "كجم", group: "الأبعاد" },
        ],
        features: [
          "تقنية Twin Cooling Plus™ للحفاظ على النضارة",
          "موزع ماء وثلج خارجي مع فلتر",
          "أرفف زجاجية مقاومة للكسر قابلة للتعديل",
          "درج كبير للخضروات مع التحكم في الرطوبة",
          "إضاءة LED داخلية موفرة للطاقة",
          "تنبيه صوتي عند فتح الباب",
          "تصميم فولاذ مقاوم للصدأ مع لمسات عصرية",
          "أقدام قابلة للتعديل لسهولة التثبيت",
        ],
        warranty: "ضمان شامل لمدة سنتين على الجهاز، 10 سنوات على الضاغط",
        details: [
          { key: "رقم الموديل", value: "RF18A5101SR" },
          { key: "اللون", value: "فضي (فولاذ مقاوم للصدأ)" },
          { key: "بلد المنشأ", value: "كوريا الجنوبية" },
          { key: "الجهد الكهربائي", value: "220-240 فولت / 50-60 هرتز" },
          { key: "نوع الباب", value: "أبواب فرنسية (بابان علويان + درج سفلي)" },
        ],
        seo: {
          metaTitle: "ثلاجة سامسونج فرنش دور 18 قدم - Twin Cooling Plus",
          metaDescription: "احصل على ثلاجة سامسونج الفاخرة بتقنية التبريد المزدوج، سعة 18 قدم، موزع ماء وثلج. ضمان سنتين. شحن مجاني.",
          metaKeywords: ["ثلاجة سامسونج", "فرنش دور", "Twin Cooling", "18 قدم", "موزع ماء"],
        },
      },
      en: {
        title: "Samsung 18 Cu.Ft French Door Refrigerator",
        subTitle: "Twin Cooling Plus with Water & Ice Dispenser",
        description: [
          {
            title: "Overview",
            content: "Samsung's premium French door refrigerator offers 18 cu.ft capacity with innovative Twin Cooling Plus™ technology that keeps food fresh longer. Features external water and ice dispenser with adjustable shelving.",
          },
          {
            title: "Key Features",
            content: "Features independent dual cooling for fridge and freezer, energy-efficient LED lighting, humidity-controlled crisper drawers, and modern stainless steel design.",
          },
        ],
        specifications: [
          { key: "Total Capacity", value: "18", unit: "cu.ft", group: "Capacity" },
          { key: "Fridge Capacity", value: "12.4", unit: "cu.ft", group: "Capacity" },
          { key: "Freezer Capacity", value: "5.6", unit: "cu.ft", group: "Capacity" },
          { key: "Annual Energy Consumption", value: "540", unit: "kWh", group: "Energy" },
          { key: "Energy Efficiency Class", value: "A++", unit: "", group: "Energy" },
          { key: "Noise Level", value: "39", unit: "dB", group: "Performance" },
          { key: "Cooling System", value: "No Frost", unit: "", group: "Cooling" },
          { key: "Width", value: "90", unit: "cm", group: "Dimensions" },
          { key: "Height", value: "178", unit: "cm", group: "Dimensions" },
          { key: "Depth", value: "73", unit: "cm", group: "Dimensions" },
          { key: "Weight", value: "95", unit: "kg", group: "Dimensions" },
        ],
        features: [
          "Twin Cooling Plus™ technology for optimal freshness",
          "External water and ice dispenser with filter",
          "Shatter-resistant glass shelves with adjustable height",
          "Large humidity-controlled crisper drawers",
          "Energy-efficient LED interior lighting",
          "Door alarm with audible alert",
          "Fingerprint-resistant stainless steel finish",
          "Adjustable leveling feet for easy installation",
        ],
        warranty: "2-year comprehensive warranty on unit, 10 years on compressor",
        details: [
          { key: "Model Number", value: "RF18A5101SR" },
          { key: "Color", value: "Stainless Steel" },
          { key: "Country of Origin", value: "South Korea" },
          { key: "Voltage", value: "220-240V / 50-60Hz" },
          { key: "Door Type", value: "French Door (2 top doors + bottom drawer)" },
        ],
        seo: {
          metaTitle: "Samsung 18 Cu.Ft French Door Refrigerator - Twin Cooling Plus",
          metaDescription: "Get Samsung's premium French door fridge with Twin Cooling Plus, 18 cu.ft capacity, water & ice dispenser. 2-year warranty. Free shipping.",
          metaKeywords: ["Samsung refrigerator", "French door", "Twin Cooling", "18 cu.ft", "water dispenser"],
        },
      },
      images: [
        { url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop" },
        { url: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&h=800&fit=crop" },
        { url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop&sat=-100" },
      ],
      sku: "SAM-RF18A5101SR",
      modelNumber: "RF18A5101SR",
      category: refrigeratorsCategory._id,
      brand: samsungBrand._id,
      price: 4500,
      discountPrice: 3825,
      stock: 25,
      status: "active",
      tags: ["best_seller", "featured", "top_rated"],
      currencyCode: "SAR",
    },

    // 2. LG Side-by-Side Refrigerator
    {
      ar: {
        title: "ثلاجة LG جنب إلى جنب 26 قدم مكعب",
        subTitle: "InstaView Door-in-Door مع تقنية الإنفيرتر",
        description: [
          {
            title: "نظرة عامة",
            content: "ثلاجة LG الواسعة بتصميم جنب إلى جنب توفر سعة ضخمة 26 قدم مكعب مع تقنية InstaView Door-in-Door الفريدة. اطرق مرتين على الباب الزجاجي لإضاءة الداخل دون فتح الباب والحفاظ على البرودة.",
          },
        ],
        specifications: [
          { key: "السعة الإجمالية", value: "26", unit: "قدم مكعب", group: "السعة" },
          { key: "سعة الثلاجة", value: "17", unit: "قدم مكعب", group: "السعة" },
          { key: "سعة الفريزر", value: "9", unit: "قدم مكعب", group: "السعة" },
          { key: "فئة كفاءة الطاقة", value: "A+", unit: "", group: "الطاقة" },
          { key: "العرض", value: "91", unit: "سم", group: "الأبعاد" },
          { key: "الارتفاع", value: "179", unit: "سم", group: "الأبعاد" },
        ],
        features: [
          "تقنية InstaView - اطرق مرتين للإضاءة",
          "Door-in-Door لسهولة الوصول للأشياء المستخدمة بكثرة",
          "ضاغط إنفيرتر خطي موفر للطاقة",
          "موزع ماء وثلج مع مكعبات وثلج مجروش",
          "أرفف Spill-Protector لمنع الانسكاب",
          "درج للخضروات مع فلتر رطوبة",
        ],
        warranty: "ضمان سنتين شامل، 10 سنوات على الضاغط الإنفيرتر",
        details: [
          { key: "رقم الموديل", value: "GC-X247CSAV" },
          { key: "اللون", value: "فضي بلاتيني" },
          { key: "بلد المنشأ", value: "كوريا الجنوبية" },
        ],
        seo: {
          metaTitle: "ثلاجة LG جنب إلى جنب 26 قدم - InstaView Door-in-Door",
          metaDescription: "ثلاجة LG الذكية بتقنية InstaView، سعة 26 قدم، إنفيرتر خطي. ضمان سنتين.",
          metaKeywords: ["ثلاجة LG", "جنب إلى جنب", "InstaView", "Door-in-Door", "26 قدم"],
        },
      },
      en: {
        title: "LG 26 Cu.Ft Side-by-Side Refrigerator",
        subTitle: "InstaView Door-in-Door with Inverter Technology",
        description: [
          {
            title: "Overview",
            content: "LG's spacious side-by-side refrigerator offers massive 26 cu.ft capacity with unique InstaView Door-in-Door technology. Knock twice on the glass panel to illuminate the interior without opening the door and losing cold air.",
          },
        ],
        specifications: [
          { key: "Total Capacity", value: "26", unit: "cu.ft", group: "Capacity" },
          { key: "Fridge Capacity", value: "17", unit: "cu.ft", group: "Capacity" },
          { key: "Freezer Capacity", value: "9", unit: "cu.ft", group: "Capacity" },
          { key: "Energy Efficiency Class", value: "A+", unit: "", group: "Energy" },
          { key: "Width", value: "91", unit: "cm", group: "Dimensions" },
          { key: "Height", value: "179", unit: "cm", group: "Dimensions" },
        ],
        features: [
          "InstaView technology - knock twice to illuminate",
          "Door-in-Door for easy access to frequently used items",
          "Linear Inverter Compressor for energy savings",
          "Water and ice dispenser with cubed and crushed ice",
          "Spill-Protector shelves to contain spills",
          "Humidity-controlled crisper with filter",
        ],
        warranty: "2-year comprehensive warranty, 10 years on Linear Inverter Compressor",
        details: [
          { key: "Model Number", value: "GC-X247CSAV" },
          { key: "Color", value: "Platinum Silver" },
          { key: "Country of Origin", value: "South Korea" },
        ],
        seo: {
          metaTitle: "LG 26 Cu.Ft Side-by-Side Refrigerator - InstaView Door-in-Door",
          metaDescription: "LG smart refrigerator with InstaView, 26 cu.ft capacity, Linear Inverter. 2-year warranty.",
          metaKeywords: ["LG refrigerator", "side-by-side", "InstaView", "Door-in-Door", "26 cu.ft"],
        },
      },
      images: [
        { url: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&h=800&fit=crop" },
        { url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop" },
      ],
      sku: "LG-GCX247CSAV",
      modelNumber: "GC-X247CSAV",
      category: refrigeratorsCategory._id,
      brand: lgBrand._id,
      price: 5200,
      discountPrice: 4680,
      stock: 15,
      status: "active",
      tags: ["new_arrival", "trending", "featured"],
      currencyCode: "SAR",
    },

    // 3. Samsung Front Load Washing Machine
    {
      ar: {
        title: "غسالة سامسونج أمامية 9 كجم",
        subTitle: "تقنية Eco Bubble مع محرك إنفيرتر رقمي",
        description: [
          {
            title: "نظرة عامة",
            content: "غسالة سامسونج الأمامية بسعة 9 كجم مع تقنية Eco Bubble الحائزة على جوائز توفر غسيلاً فعالاً حتى في الماء البارد. مزودة بمحرك Digital Inverter الهادئ والموفر للطاقة مع ضمان 20 سنة.",
          },
        ],
        specifications: [
          { key: "سعة الغسيل", value: "9", unit: "كجم", group: "السعة" },
          { key: "سرعة العصر", value: "1400", unit: "دورة/دقيقة", group: "الأداء" },
          { key: "فئة كفاءة الطاقة", value: "A+++", unit: "", group: "الطاقة" },
          { key: "استهلاك الماء", value: "45", unit: "لتر/دورة", group: "الاستهلاك" },
          { key: "مستوى الضوضاء (غسيل)", value: "54", unit: "ديسيبل", group: "الأداء" },
          { key: "مستوى الضوضاء (عصر)", value: "74", unit: "ديسيبل", group: "الأداء" },
          { key: "العرض", value: "60", unit: "سم", group: "الأبعاد" },
          { key: "الارتفاع", value: "85", unit: "سم", group: "الأبعاد" },
          { key: "العمق", value: "60", unit: "سم", group: "الأبعاد" },
        ],
        features: [
          "تقنية Eco Bubble لغسيل فعال في الماء البارد",
          "محرك Digital Inverter مع ضمان 20 سنة",
          "طبلة Diamond Drum لحماية الأقمشة الحساسة",
          "برنامج Quick Wash 15 دقيقة",
          "برنامج Bubble Soak للبقع الصعبة",
          "تأخير بدء التشغيل حتى 24 ساعة",
          "قفل الأطفال للأمان",
          "شاشة LED رقمية",
        ],
        warranty: "ضمان سنتين شامل، 20 سنة على المحرك الرقمي",
        details: [
          { key: "رقم الموديل", value: "WW90T4040CE" },
          { key: "اللون", value: "أبيض" },
          { key: "نوع التحميل", value: "أمامي" },
          { key: "عدد البرامج", value: "14" },
        ],
        seo: {
          metaTitle: "غسالة سامسونج أمامية 9 كجم - Eco Bubble",
          metaDescription: "غسالة سامسونج بتقنية Eco Bubble، سعة 9 كجم، A+++. ضمان 20 سنة على المحرك.",
          metaKeywords: ["غسالة سامسونج", "9 كجم", "Eco Bubble", "أمامية", "Digital Inverter"],
        },
      },
      en: {
        title: "Samsung 9kg Front Load Washing Machine",
        subTitle: "Eco Bubble Technology with Digital Inverter Motor",
        description: [
          {
            title: "Overview",
            content: "Samsung's 9kg front load washer with award-winning Eco Bubble technology provides effective washing even in cold water. Features quiet and energy-efficient Digital Inverter motor with 20-year warranty.",
          },
        ],
        specifications: [
          { key: "Wash Capacity", value: "9", unit: "kg", group: "Capacity" },
          { key: "Spin Speed", value: "1400", unit: "RPM", group: "Performance" },
          { key: "Energy Efficiency", value: "A+++", unit: "", group: "Energy" },
          { key: "Water Consumption", value: "45", unit: "L/cycle", group: "Consumption" },
          { key: "Noise Level (Wash)", value: "54", unit: "dB", group: "Performance" },
          { key: "Noise Level (Spin)", value: "74", unit: "dB", group: "Performance" },
          { key: "Width", value: "60", unit: "cm", group: "Dimensions" },
          { key: "Height", value: "85", unit: "cm", group: "Dimensions" },
          { key: "Depth", value: "60", unit: "cm", group: "Dimensions" },
        ],
        features: [
          "Eco Bubble technology for effective cold water washing",
          "Digital Inverter Motor with 20-year warranty",
          "Diamond Drum to protect delicate fabrics",
          "Quick Wash program 15 minutes",
          "Bubble Soak for tough stains",
          "Delay start up to 24 hours",
          "Child lock for safety",
          "LED digital display",
        ],
        warranty: "2-year comprehensive warranty, 20 years on Digital Inverter Motor",
        details: [
          { key: "Model Number", value: "WW90T4040CE" },
          { key: "Color", value: "White" },
          { key: "Load Type", value: "Front Load" },
          { key: "Number of Programs", value: "14" },
        ],
        seo: {
          metaTitle: "Samsung 9kg Front Load Washing Machine - Eco Bubble",
          metaDescription: "Samsung washer with Eco Bubble technology, 9kg capacity, A+++. 20-year motor warranty.",
          metaKeywords: ["Samsung washer", "9kg", "Eco Bubble", "front load", "Digital Inverter"],
        },
      },
      images: [
        { url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop" },
        { url: "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800&h=800&fit=crop" },
      ],
      sku: "SAM-WW90T4040CE",
      modelNumber: "WW90T4040CE",
      category: washingMachinesCategory._id,
      brand: samsungBrand._id,
      price: 2800,
      discountPrice: 2240,
      stock: 30,
      status: "active",
      tags: ["on_sale", "best_seller", "top_rated"],
      currencyCode: "SAR",
    },

    // 4. Bosch Front Load Washing Machine
    {
      ar: {
        title: "غسالة بوش أمامية 8 كجم",
        subTitle: "VarioPerfect مع محرك EcoSilence Drive",
        description: [
          {
            title: "نظرة عامة",
            content: "غسالة بوش الألمانية بسعة 8 كجم توفر مزيجاً مثالياً من الأداء والكفاءة. تقنية VarioPerfect تتيح لك اختيار توفير الوقت بنسبة 65% أو توفير الطاقة بنسبة 50%.",
          },
        ],
        specifications: [
          { key: "سعة الغسيل", value: "8", unit: "كجم", group: "السعة" },
          { key: "سرعة العصر", value: "1200", unit: "دورة/دقيقة", group: "الأداء" },
          { key: "فئة كفاءة الطاقة", value: "A+++", unit: "", group: "الطاقة" },
          { key: "العرض", value: "60", unit: "سم", group: "الأبعاد" },
          { key: "الارتفاع", value: "85", unit: "سم", group: "الأبعاد" },
        ],
        features: [
          "تقنية VarioPerfect - وفّر الوقت أو الطاقة",
          "محرك EcoSilence Drive الهادئ والمتين",
          "نظام ActiveWater Plus لتوفير الماء",
          "طبلة VarioDrum لحماية الملابس",
          "برنامج AllergyPlus لإزالة مسببات الحساسية",
          "نظام حماية من التسرب AquaStop",
        ],
        warranty: "ضمان سنتين شامل، 10 سنوات على المحرك",
        details: [
          { key: "رقم الموديل", value: "WAJ2846SGB" },
          { key: "اللون", value: "أبيض" },
          { key: "بلد المنشأ", value: "ألمانيا" },
        ],
        seo: {
          metaTitle: "غسالة بوش أمامية 8 كجم - VarioPerfect",
          metaDescription: "غسالة بوش الألمانية بتقنية VarioPerfect، سعة 8 كجم، محرك صامت. ضمان سنتين.",
          metaKeywords: ["غسالة بوش", "8 كجم", "VarioPerfect", "EcoSilence", "ألمانية"],
        },
      },
      en: {
        title: "Bosch 8kg Front Load Washing Machine",
        subTitle: "VarioPerfect with EcoSilence Drive Motor",
        description: [
          {
            title: "Overview",
            content: "Bosch's German-engineered 8kg washer offers the perfect blend of performance and efficiency. VarioPerfect technology lets you choose to save 65% time or 50% energy.",
          },
        ],
        specifications: [
          { key: "Wash Capacity", value: "8", unit: "kg", group: "Capacity" },
          { key: "Spin Speed", value: "1200", unit: "RPM", group: "Performance" },
          { key: "Energy Efficiency", value: "A+++", unit: "", group: "Energy" },
          { key: "Width", value: "60", unit: "cm", group: "Dimensions" },
          { key: "Height", value: "85", unit: "cm", group: "Dimensions" },
        ],
        features: [
          "VarioPerfect technology - save time or energy",
          "EcoSilence Drive motor - quiet and durable",
          "ActiveWater Plus system for water savings",
          "VarioDrum for fabric protection",
          "AllergyPlus program to remove allergens",
          "AquaStop leak protection system",
        ],
        warranty: "2-year comprehensive warranty, 10 years on motor",
        details: [
          { key: "Model Number", value: "WAJ2846SGB" },
          { key: "Color", value: "White" },
          { key: "Country of Origin", value: "Germany" },
        ],
        seo: {
          metaTitle: "Bosch 8kg Front Load Washing Machine - VarioPerfect",
          metaDescription: "Bosch German washer with VarioPerfect, 8kg capacity, silent motor. 2-year warranty.",
          metaKeywords: ["Bosch washer", "8kg", "VarioPerfect", "EcoSilence", "German"],
        },
      },
      images: [
        { url: "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800&h=800&fit=crop" },
      ],
      sku: "BOS-WAJ2846SGB",
      modelNumber: "WAJ2846SGB",
      category: washingMachinesCategory._id,
      brand: boschBrand._id,
      price: 3200,
      stock: 20,
      status: "active",
      tags: ["top_rated", "featured", "eco_friendly"],
      currencyCode: "SAR",
    },

    // 5. LG Split AC with WiFi
    {
      ar: {
        title: "مكيف LG سبليت 18000 وحدة مع WiFi",
        subTitle: "تقنية Dual Inverter مع تحكم ThinQ",
        description: [
          {
            title: "نظرة عامة",
            content: "مكيف LG الذكي بقوة تبريد 18000 وحدة حرارية بريطانية مع تقنية Dual Inverter Compressor™ التي توفر تبريداً أسرع وأهدأ واستهلاك أقل للطاقة. يمكن التحكم به عن بعد عبر تطبيق LG ThinQ.",
          },
        ],
        specifications: [
          { key: "قوة التبريد", value: "18000", unit: "وحدة حرارية", group: "الأداء" },
          { key: "قوة التدفئة", value: "19200", unit: "وحدة حرارية", group: "الأداء" },
          { key: "فئة كفاءة الطاقة", value: "A++", unit: "", group: "الطاقة" },
          { key: "مستوى الضوضاء (داخلي)", value: "19", unit: "ديسيبل", group: "الضوضاء" },
          { key: "مستوى الضوضاء (خارجي)", value: "54", unit: "ديسيبل", group: "الضوضاء" },
          { key: "المساحة المناسبة", value: "25-30", unit: "متر مربع", group: "التغطية" },
        ],
        features: [
          "ضاغط Dual Inverter™ موفر للطاقة بنسبة 70%",
          "تحكم ذكي عبر WiFi وتطبيق LG ThinQ",
          "نظام تنقية الهواء Gold Fin",
          "وضع Auto Clean للتنظيف الذاتي",
          "وضع Jet Cool للتبريد السريع",
          "مؤقت 24 ساعة قابل للبرمجة",
          "شاشة LED رقمية على الوحدة الداخلية",
          "ريموت كنترول ذكي مع شاشة",
        ],
        warranty: "ضمان سنتين شامل، 10 سنوات على الضاغط",
        details: [
          { key: "رقم الموديل", value: "S4-W18JA3AA" },
          { key: "نوع الفريون", value: "R32 صديق للبيئة" },
          { key: "الجهد الكهربائي", value: "220-240 فولت" },
        ],
        seo: {
          metaTitle: "مكيف LG سبليت 18000 وحدة WiFi - Dual Inverter",
          metaDescription: "مكيف LG الذكي بتقنية Dual Inverter، 18000 وحدة، WiFi، توفير 70% طاقة. ضمان سنتين.",
          metaKeywords: ["مكيف LG", "18000 وحدة", "WiFi", "Dual Inverter", "ThinQ"],
        },
      },
      en: {
        title: "LG 18000 BTU Split AC with WiFi",
        subTitle: "Dual Inverter Technology with ThinQ Control",
        description: [
          {
            title: "Overview",
            content: "LG's smart air conditioner with 18000 BTU cooling capacity features Dual Inverter Compressor™ technology for faster, quieter cooling with lower energy consumption. Remote control via LG ThinQ app.",
          },
        ],
        specifications: [
          { key: "Cooling Capacity", value: "18000", unit: "BTU", group: "Performance" },
          { key: "Heating Capacity", value: "19200", unit: "BTU", group: "Performance" },
          { key: "Energy Efficiency", value: "A++", unit: "", group: "Energy" },
          { key: "Noise Level (Indoor)", value: "19", unit: "dB", group: "Noise" },
          { key: "Noise Level (Outdoor)", value: "54", unit: "dB", group: "Noise" },
          { key: "Suitable Area", value: "25-30", unit: "sqm", group: "Coverage" },
        ],
        features: [
          "Dual Inverter™ Compressor saves 70% energy",
          "Smart WiFi control via LG ThinQ app",
          "Gold Fin air purification system",
          "Auto Clean mode for self-cleaning",
          "Jet Cool mode for rapid cooling",
          "24-hour programmable timer",
          "LED digital display on indoor unit",
          "Smart remote control with display",
        ],
        warranty: "2-year comprehensive warranty, 10 years on compressor",
        details: [
          { key: "Model Number", value: "S4-W18JA3AA" },
          { key: "Refrigerant Type", value: "R32 Eco-friendly" },
          { key: "Voltage", value: "220-240V" },
        ],
        seo: {
          metaTitle: "LG 18000 BTU Split AC WiFi - Dual Inverter",
          metaDescription: "LG smart AC with Dual Inverter technology, 18000 BTU, WiFi, 70% energy savings. 2-year warranty.",
          metaKeywords: ["LG AC", "18000 BTU", "WiFi", "Dual Inverter", "ThinQ"],
        },
      },
      images: [
        { url: "https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=800&h=800&fit=crop" },
        { url: "https://images.unsplash.com/photo-1631545806609-57b35c56734f?w=800&h=800&fit=crop" },
      ],
      sku: "LG-S4W18JA3AA",
      modelNumber: "S4-W18JA3AA",
      category: airConditionersCategory._id,
      brand: lgBrand._id,
      price: 3500,
      discountPrice: 2975,
      stock: 40,
      status: "active",
      tags: ["hot", "trending", "featured", "best_seller"],
      currencyCode: "SAR",
    },
  ];

  // Generate 20 more products for variety
  const additionalProductTemplates = [
    { category: refrigeratorsCategory, catNameEn: "Refrigerator", catNameAr: "ثلاجة", images: ["https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop"] },
    { category: washingMachinesCategory, catNameEn: "Washing Machine", catNameAr: "غسالة", images: ["https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop"] },
    { category: airConditionersCategory, catNameEn: "Air Conditioner", catNameAr: "مكيف", images: ["https://images.unsplash.com/photo-1585909695284-32d2985ac9c0?w=800&h=800&fit=crop"] },
    { category: ovensCategory, catNameEn: "Oven", catNameAr: "فرن", images: ["https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&h=800&fit=crop"] },
    { category: dishwashersCategory, catNameEn: "Dishwasher", catNameAr: "غسالة صحون", images: ["https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=800&fit=crop"] },
    { category: microwavesCategory, catNameEn: "Microwave", catNameAr: "ميكروويف", images: ["https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&h=800&fit=crop"] },
    { category: smallAppliancesCategory, catNameEn: "Small Appliance", catNameAr: "جهاز صغير", images: ["https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&h=800&fit=crop"] },
  ];

  for (let i = 0; i < 20; i++) {
    const brand = brands[i % brands.length];
    const template = additionalProductTemplates[i % additionalProductTemplates.length];
    const modelNum = `MD${1000 + i}`;
    const capacity = [5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 24][i % 11];
    const price = Math.floor(Math.random() * 3000) + 1500;
    const hasDiscount = Math.random() > 0.4;
    const discountPercent = hasDiscount ? [10, 15, 20, 25, 30][Math.floor(Math.random() * 5)] : 0;

    products.push({
      ar: {
        title: `${brand.ar.name} ${template.catNameAr} ${capacity} ${template.category === washingMachinesCategory._id ? 'كجم' : template.category === airConditionersCategory._id ? 'وحدة' : 'قدم'}`,
        subTitle: `موديل ${modelNum} - تقنية حديثة`,
        description: [
          {
            title: "نظرة عامة",
            content: `${template.catNameAr} عالية الجودة من ${brand.ar.name} بسعة ${capacity} مع تصميم عصري وأداء ممتاز. مصممة لتلبية احتياجات العائلات العصرية.`,
          },
        ],
        specifications: [
          { key: "السعة", value: String(capacity), unit: template.category === washingMachinesCategory._id ? "كجم" : template.category === airConditionersCategory._id ? "وحدة" : "قدم", group: "المواصفات" },
          { key: "فئة الطاقة", value: ["A++", "A+++"][Math.floor(Math.random() * 2)], unit: "", group: "الطاقة" },
          { key: "اللون", value: ["أبيض", "فضي", "أسود"][Math.floor(Math.random() * 3)], unit: "", group: "التصميم" },
        ],
        features: [
          "تصميم عصري وأنيق",
          "موفر للطاقة",
          "سهل الاستخدام",
          "أداء عالي الجودة",
        ],
        warranty: "ضمان سنتين شامل",
        details: [
          { key: "رقم الموديل", value: modelNum },
          { key: "العلامة التجارية", value: brand.ar.name },
        ],
        seo: {
          metaTitle: `${brand.ar.name} ${template.catNameAr} ${capacity}`,
          metaDescription: `${template.catNameAr} ${brand.ar.name} بسعة ${capacity}، جودة عالية وأداء ممتاز`,
          metaKeywords: [brand.ar.name, template.catNameAr],
        },
      },
      en: {
        title: `${brand.en.name} ${template.catNameEn} ${capacity} ${template.category === washingMachinesCategory._id ? 'kg' : template.category === airConditionersCategory._id ? 'BTU' : 'cu.ft'}`,
        subTitle: `Model ${modelNum} - Modern Technology`,
        description: [
          {
            title: "Overview",
            content: `High-quality ${template.catNameEn.toLowerCase()} from ${brand.en.name} with ${capacity} capacity featuring modern design and excellent performance. Designed for modern family needs.`,
          },
        ],
        specifications: [
          { key: "Capacity", value: String(capacity), unit: template.category === washingMachinesCategory._id ? "kg" : template.category === airConditionersCategory._id ? "BTU" : "cu.ft", group: "Specifications" },
          { key: "Energy Class", value: ["A++", "A+++"][Math.floor(Math.random() * 2)], unit: "", group: "Energy" },
          { key: "Color", value: ["White", "Silver", "Black"][Math.floor(Math.random() * 3)], unit: "", group: "Design" },
        ],
        features: [
          "Modern and elegant design",
          "Energy efficient",
          "Easy to use",
          "High quality performance",
        ],
        warranty: "2-year comprehensive warranty",
        details: [
          { key: "Model Number", value: modelNum },
          { key: "Brand", value: brand.en.name },
        ],
        seo: {
          metaTitle: `${brand.en.name} ${template.catNameEn} ${capacity}`,
          metaDescription: `${brand.en.name} ${template.catNameEn.toLowerCase()} with ${capacity} capacity, high quality and excellent performance`,
          metaKeywords: [brand.en.name, template.catNameEn],
        },
      },
      images: template.images.map(url => ({ url })),
      sku: `${brand.en.slug.toUpperCase()}-${modelNum}`,
      modelNumber: modelNum,
      category: template.category._id,
      brand: brand._id,
      price: price,
      discountPrice: hasDiscount ? Math.floor(price * (1 - discountPercent / 100)) : 0,
      stock: Math.floor(Math.random() * 40) + 10,
      status: "active",
      tags: hasDiscount ? ["on_sale"] : Math.random() > 0.7 ? ["featured"] : [],
      currencyCode: "SAR",
    });
  }

  for (const product of products) {
    const existing = await Product.findOne({ sku: product.sku });
    if (!existing) {
      await Product.create(product);
      console.log(`✓ Created product: ${product.en.title}`);
    }
  }
};

/* --------------------------------------------------
   SEED BLOGS
--------------------------------------------------- */
const seedBlogs = async () => {
  const adminUser = await User.findOne({ legacyRole: "superAdmin" });

  if (!adminUser) {
    console.log("⚠ Cannot seed blogs: Admin user not found");
    return;
  }

  const blogs = [
    {
      ar: {
        title: "أفضل 10 نصائح لصيانة الثلاجة وإطالة عمرها",
        slug: "best-10-refrigerator-maintenance-tips",
        excerpt: "تعرف على أهم النصائح العملية للحفاظ على ثلاجتك في أفضل حالة وإطالة عمرها الافتراضي مع توفير استهلاك الكهرباء",
        content: `<h2>مقدمة</h2>
<p>الثلاجة من أهم الأجهزة المنزلية التي نعتمد عليها يومياً للحفاظ على طعامنا طازجاً وآمناً. الصيانة الدورية البسيطة يمكن أن تطيل عمر ثلاجتك وتوفر لك المال على المدى الطويل.</p>

<h3>1. تنظيف ملفات المكثف</h3>
<p>ملفات المكثف الموجودة خلف أو أسفل الثلاجة تحتاج للتنظيف كل 6 أشهر. الغبار والأوساخ المتراكمة تجعل الضاغط يعمل بجهد أكبر مما يزيد استهلاك الكهرباء ويقلل عمر الثلاجة.</p>

<h3>2. فحص مانع تسرب الباب</h3>
<p>تأكد من أن الحشوة المطاطية حول الباب نظيفة ومحكمة الإغلاق. يمكنك اختبارها بوضع ورقة بين الباب والثلاجة - إذا سقطت الورقة بسهولة فقد تحتاج لاستبدال الحشوة.</p>

<h3>3. ضبط درجة الحرارة المناسبة</h3>
<p>درجة الحرارة المثالية للثلاجة هي 3-4 درجات مئوية، وللفريزر -18 درجة. درجات أبرد من اللازم تزيد استهلاك الطاقة دون فائدة.</p>

<h3>4. عدم ملء الثلاجة بشكل زائد</h3>
<p>الهواء البارد يحتاج للدوران بحرية داخل الثلاجة. ترك مسافة 5 سم على الأقل بين الأطعمة يحسن الكفاءة.</p>

<h3>5. تنظيف الثلاجة من الداخل شهرياً</h3>
<p>استخدم محلول من الماء والخل لتنظيف الأرفف والأدراج. هذا يمنع الروائح الكريهة ويحافظ على نظافة الطعام.</p>

<h3>6. إزالة الثلج بانتظام (للثلاجات غير No-Frost)</h3>
<p>إذا كانت ثلاجتك لا تحتوي على تقنية إزالة الثلج التلقائي، قم بإزالته عندما يتجاوز سمكه 5 ملم.</p>

<h3>7. فحص نظام تصريف المياه</h3>
<p>تأكد من أن فتحة التصريف غير مسدودة لمنع تجمع المياه داخل الثلاجة.</p>

<h3>8. عدم وضع أطعمة ساخنة</h3>
<p>انتظر حتى تبرد الأطعمة للحرارة العادية قبل وضعها في الثلاجة.</p>

<h3>9. ترك مسافة كافية حول الثلاجة</h3>
<p>اترك 10 سم على الأقل من الخلف والجوانب لضمان تهوية جيدة.</p>

<h3>10. فحص الضاغط سنوياً</h3>
<p>استدعِ فني متخصص لفحص الضاغط ونظام التبريد سنوياً لاكتشاف أي مشاكل مبكراً.</p>

<h2>الخلاصة</h2>
<p>الصيانة الدورية البسيطة يمكن أن تضيف سنوات لعمر ثلاجتك وتوفر لك مئات الريالات في فواتير الكهرباء. اتبع هذه النصائح وستحافظ على ثلاجتك في حالة ممتازة.</p>`,
        authorName: "فريق خبراء الأجهزة المنزلية",
        tags: ["ثلاجة", "صيانة", "نصائح", "توفير الطاقة"],
        seo: {
          metaTitle: "أفضل 10 نصائح لصيانة الثلاجة وإطالة عمرها | دليل شامل 2024",
          metaDescription: "دليل شامل لصيانة الثلاجة بطرق بسيطة وفعالة. تعلم كيف تحافظ على ثلاجتك لسنوات مع توفير فاتورة الكهرباء.",
          metaKeywords: ["صيانة الثلاجة", "نصائح الثلاجة", "إطالة عمر الثلاجة", "توفير الطاقة"],
        },
      },
      en: {
        title: "Top 10 Refrigerator Maintenance Tips to Extend Its Life",
        slug: "top-10-refrigerator-maintenance-tips-extend-life",
        excerpt: "Learn the most practical tips to keep your refrigerator in top condition, extend its lifespan, and save on electricity bills",
        content: `<h2>Introduction</h2>
<p>Your refrigerator is one of the most important home appliances we rely on daily to keep our food fresh and safe. Simple regular maintenance can extend your fridge's life and save you money in the long run.</p>

<h3>1. Clean the Condenser Coils</h3>
<p>Condenser coils located behind or below the refrigerator need cleaning every 6 months. Accumulated dust and dirt make the compressor work harder, increasing electricity consumption and reducing the fridge's lifespan.</p>

<h3>2. Check the Door Seal</h3>
<p>Ensure the rubber gasket around the door is clean and seals tightly. You can test it by placing a paper between the door and fridge - if the paper falls easily, you may need to replace the gasket.</p>

<h3>3. Set the Right Temperature</h3>
<p>The ideal temperature for the fridge is 3-4°C, and for the freezer -18°C. Colder temperatures increase energy consumption without benefit.</p>

<h3>4. Don't Overfill the Refrigerator</h3>
<p>Cold air needs to circulate freely inside the fridge. Leaving at least 5 cm space between foods improves efficiency.</p>

<h3>5. Clean Inside Monthly</h3>
<p>Use a solution of water and vinegar to clean shelves and drawers. This prevents bad odors and keeps food clean.</p>

<h3>6. Defrost Regularly (for non-No-Frost fridges)</h3>
<p>If your fridge doesn't have automatic defrost technology, remove frost when it exceeds 5mm thickness.</p>

<h3>7. Check the Drainage System</h3>
<p>Make sure the drain hole isn't blocked to prevent water pooling inside the fridge.</p>

<h3>8. Don't Put Hot Food Inside</h3>
<p>Wait until food cools to room temperature before placing it in the refrigerator.</p>

<h3>9. Leave Adequate Space Around the Fridge</h3>
<p>Leave at least 10 cm from the back and sides to ensure good ventilation.</p>

<h3>10. Annual Compressor Check</h3>
<p>Call a specialized technician to check the compressor and cooling system annually to detect problems early.</p>

<h2>Conclusion</h2>
<p>Simple regular maintenance can add years to your refrigerator's life and save you hundreds on electricity bills. Follow these tips to keep your fridge in excellent condition.</p>`,
        authorName: "Home Appliances Expert Team",
        tags: ["refrigerator", "maintenance", "tips", "energy saving"],
        seo: {
          metaTitle: "Top 10 Refrigerator Maintenance Tips to Extend Its Life | Complete Guide 2024",
          metaDescription: "Complete guide to refrigerator maintenance with simple and effective methods. Learn how to keep your fridge for years while saving on electricity bills.",
          metaKeywords: ["refrigerator maintenance", "fridge tips", "extend fridge life", "energy saving"],
        },
      },
      featuredImage: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=1200&h=630&fit=crop",
      category: "maintenance",
      author: adminUser._id,
      status: "published",
      publishedAt: new Date(Date.now() - 5 * 86400000),
      isFeatured: true,
      featuredOrder: 1,
      views: 2847,
      likes: 234,
      shares: 89,
    },

    {
      ar: {
        title: "دليل شامل لاختيار الغسالة المناسبة لمنزلك في 2024",
        slug: "complete-guide-choose-right-washing-machine-2024",
        excerpt: "كل ما تحتاج معرفته قبل شراء غسالة جديدة: الأنواع، السعات، التقنيات، والعلامات التجارية الموثوقة",
        content: `<h2>مقدمة</h2>
<p>شراء غسالة جديدة قرار مهم يؤثر على راحتك اليومية لسنوات قادمة. مع تعدد الأنواع والمواصفات في السوق، قد يكون الاختيار محيراً. في هذا الدليل الشامل، سنساعدك على اختيار الغسالة المثالية.</p>

<h3>أنواع الغسالات</h3>
<h4>1. الغسالة الأمامية (Front Load)</h4>
<p><strong>المميزات:</strong></p>
<ul>
<li>أكثر كفاءة في استهلاك الماء والكهرباء</li>
<li>أقل ضوضاء أثناء التشغيل</li>
<li>أكثر لطفاً على الأقمشة</li>
<li>إمكانية التكديس لتوفير المساحة</li>
</ul>
<p><strong>العيوب:</strong></p>
<ul>
<li>أغلى سعراً</li>
<li>دورة الغسيل أطول</li>
<li>تحتاج للانحناء لتحميل الملابس</li>
</ul>

<h4>2. الغسالة العلوية (Top Load)</h4>
<p><strong>المميزات:</strong></p>
<ul>
<li>أسعار أقل</li>
<li>سهولة في التحميل</li>
<li>دورة غسيل أسرع</li>
</ul>
<p><strong>العيوب:</strong></p>
<ul>
<li>استهلاك أكبر للماء</li>
<li>أكثر قسوة على الأقمشة</li>
<li>لا يمكن التكديس</li>
</ul>

<h3>اختيار السعة المناسبة</h3>
<ul>
<li><strong>1-2 أشخاص:</strong> 5-6 كجم</li>
<li><strong>3-4 أشخاص:</strong> 7-8 كجم</li>
<li><strong>5+ أشخاص:</strong> 9-12 كجم</li>
</ul>

<h3>التقنيات الحديثة</h3>
<h4>محرك الإنفيرتر (Inverter Motor)</h4>
<p>يوفر حتى 40% من استهلاك الكهرباء، أهدأ، وأطول عمراً. معظم الشركات تقدم ضمان 10-20 سنة على محرك الإنفيرتر.</p>

<h4>تقنية البخار (Steam Technology)</h4>
<p>تساعد في إزالة البقع الصعبة والبكتيريا دون مواد كيميائية قاسية. مثالية للعائلات مع أطفال أو من يعانون من الحساسية.</p>

<h4>الغسيل بالفقاعات (Eco Bubble)</h4>
<p>تقنية سامسونج الحصرية تذيب المسحوق في فقاعات تخترق الأقمشة بسرعة، مما يتيح الغسيل الفعال في الماء البارد.</p>

<h3>أفضل العلامات التجارية</h3>
<ul>
<li><strong>سامسونج:</strong> تقنيات مبتكرة وموثوقية عالية</li>
<li><strong>LG:</strong> محركات إنفيرتر متطورة وهدوء تام</li>
<li><strong>بوش:</strong> جودة ألمانية وكفاءة ممتازة</li>
<li><strong>ويرلبول:</strong> قيمة رائعة مقابل السعر</li>
</ul>

<h2>الخلاصة</h2>
<p>اختر الغسالة بناءً على:</p>
<ol>
<li>حجم عائلتك (السعة)</li>
<li>ميزانيتك</li>
<li>المساحة المتاحة</li>
<li>احتياجاتك الخاصة (ملابس حساسة، أطفال، إلخ)</li>
<li>كفاءة الطاقة</li>
</ol>`,
        authorName: "فريق خبراء الأجهزة المنزلية",
        tags: ["غسالة", "دليل شراء", "نصائح", "مقارنة"],
        seo: {
          metaTitle: "دليل شامل لاختيار الغسالة المناسبة لمنزلك 2024 | نصائح الخبراء",
          metaDescription: "تعرف على كيفية اختيار الغسالة المثالية: مقارنة بين الأمامية والعلوية، السعات المناسبة، أفضل التقنيات والعلامات التجارية.",
          metaKeywords: ["اختيار غسالة", "شراء غسالة", "أفضل غسالة", "مقارنة غسالات", "دليل شراء"],
        },
      },
      en: {
        title: "Complete Guide to Choosing the Right Washing Machine in 2024",
        slug: "complete-guide-choose-right-washing-machine-home-2024",
        excerpt: "Everything you need to know before buying a new washer: types, capacities, technologies, and trusted brands",
        content: `<h2>Introduction</h2>
<p>Buying a new washing machine is an important decision that affects your daily comfort for years to come. With multiple types and specifications in the market, choosing can be confusing. In this comprehensive guide, we'll help you choose the perfect washing machine.</p>

<h3>Types of Washing Machines</h3>
<h4>1. Front Load Washer</h4>
<p><strong>Advantages:</strong></p>
<ul>
<li>More efficient in water and electricity consumption</li>
<li>Less noise during operation</li>
<li>Gentler on fabrics</li>
<li>Stackable to save space</li>
</ul>
<p><strong>Disadvantages:</strong></p>
<ul>
<li>Higher price</li>
<li>Longer wash cycle</li>
<li>Need to bend to load clothes</li>
</ul>

<h4>2. Top Load Washer</h4>
<p><strong>Advantages:</strong></p>
<ul>
<li>Lower prices</li>
<li>Easy loading</li>
<li>Faster wash cycle</li>
</ul>
<p><strong>Disadvantages:</strong></p>
<ul>
<li>Higher water consumption</li>
<li>Harsher on fabrics</li>
<li>Cannot be stacked</li>
</ul>

<h3>Choosing the Right Capacity</h3>
<ul>
<li><strong>1-2 people:</strong> 5-6 kg</li>
<li><strong>3-4 people:</strong> 7-8 kg</li>
<li><strong>5+ people:</strong> 9-12 kg</li>
</ul>

<h3>Modern Technologies</h3>
<h4>Inverter Motor</h4>
<p>Saves up to 40% electricity consumption, quieter, and lasts longer. Most companies offer 10-20 year warranty on inverter motors.</p>

<h4>Steam Technology</h4>
<p>Helps remove tough stains and bacteria without harsh chemicals. Perfect for families with children or allergy sufferers.</p>

<h4>Eco Bubble Washing</h4>
<p>Samsung's exclusive technology dissolves detergent in bubbles that penetrate fabrics quickly, enabling effective washing in cold water.</p>

<h3>Best Brands</h3>
<ul>
<li><strong>Samsung:</strong> Innovative technologies and high reliability</li>
<li><strong>LG:</strong> Advanced inverter motors and complete silence</li>
<li><strong>Bosch:</strong> German quality and excellent efficiency</li>
<li><strong>Whirlpool:</strong> Great value for money</li>
</ul>

<h2>Conclusion</h2>
<p>Choose your washer based on:</p>
<ol>
<li>Family size (capacity)</li>
<li>Budget</li>
<li>Available space</li>
<li>Special needs (delicate clothes, children, etc.)</li>
<li>Energy efficiency</li>
</ol>`,
        authorName: "Home Appliances Expert Team",
        tags: ["washing machine", "buying guide", "tips", "comparison"],
        seo: {
          metaTitle: "Complete Guide to Choosing the Right Washing Machine 2024 | Expert Tips",
          metaDescription: "Learn how to choose the perfect washing machine: comparison between front-load and top-load, suitable capacities, best technologies and brands.",
          metaKeywords: ["choose washing machine", "buy washer", "best washing machine", "washer comparison", "buying guide"],
        },
      },
      featuredImage: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=1200&h=630&fit=crop",
      category: "buying_guide",
      author: adminUser._id,
      status: "published",
      publishedAt: new Date(Date.now() - 10 * 86400000),
      isFeatured: true,
      featuredOrder: 2,
      views: 3421,
      likes: 298,
      shares: 156,
    },
  ];

  // Generate 8 more blog posts
  const categories = ["tips", "guides", "reviews", "energy_saving", "seasonal"];
  const topics = [
    { ar: "نصائح توفير الطاقة", en: "Energy Saving Tips" },
    { ar: "أحدث تقنيات الأجهزة المنزلية", en: "Latest Home Appliance Technologies" },
    { ar: "مقارنة بين العلامات التجارية", en: "Brand Comparison" },
    { ar: "كيفية العناية بالأجهزة", en: "How to Care for Appliances" },
    { ar: "أفضل الأجهزة للمطبخ", en: "Best Kitchen Appliances" },
    { ar: "دليل التسوق الذكي", en: "Smart Shopping Guide" },
    { ar: "حلول المساحات الصغيرة", en: "Small Space Solutions" },
    { ar: "الأجهزة الصديقة للبيئة", en: "Eco-Friendly Appliances" },
  ];

  for (let i = 0; i < 8; i++) {
    const topic = topics[i];
    const category = categories[i % categories.length];
    const daysAgo = 15 + i * 5;

    blogs.push({
      ar: {
        title: `${topic.ar} - دليل شامل ${2024}`,
        slug: `${topic.en.toLowerCase().replace(/\s+/g, '-')}-complete-guide-${i + 3}`,
        excerpt: `دليل متكامل عن ${topic.ar} مع نصائح عملية ومعلومات مفيدة لكل منزل`,
        content: `<h2>مقدمة</h2><p>مقال شامل عن ${topic.ar} يقدم لك كل المعلومات التي تحتاجها...</p><h3>النقاط الرئيسية</h3><p>محتوى تفصيلي عن الموضوع مع أمثلة عملية...</p>`,
        authorName: "فريق خبراء الأجهزة المنزلية",
        tags: ["نصائح", "دليل", "أجهزة منزلية"],
        seo: {
          metaTitle: `${topic.ar} | دليل شامل ${2024}`,
          metaDescription: `تعرف على كل ما يخص ${topic.ar} مع نصائح الخبراء ومعلومات عملية مفيدة`,
          metaKeywords: [topic.ar, "نصائح", "دليل"],
        },
      },
      en: {
        title: `${topic.en} - Complete Guide ${2024}`,
        slug: `${topic.en.toLowerCase().replace(/\s+/g, '-')}-complete-guide-en-${i + 3}`,
        excerpt: `Comprehensive guide about ${topic.en} with practical tips and useful information for every home`,
        content: `<h2>Introduction</h2><p>Complete article about ${topic.en} providing you with all the information you need...</p><h3>Key Points</h3><p>Detailed content about the topic with practical examples...</p>`,
        authorName: "Home Appliances Expert Team",
        tags: ["tips", "guide", "home appliances"],
        seo: {
          metaTitle: `${topic.en} | Complete Guide ${2024}`,
          metaDescription: `Learn everything about ${topic.en} with expert tips and practical useful information`,
          metaKeywords: [topic.en, "tips", "guide"],
        },
      },
      featuredImage: `https://images.unsplash.com/photo-${1570000000000 + i * 1000000}?w=1200&h=630&fit=crop`,
      category: category,
      author: adminUser._id,
      status: "published",
      publishedAt: new Date(Date.now() - daysAgo * 86400000),
      isFeatured: i < 3,
      featuredOrder: i < 3 ? i + 3 : 0,
      views: Math.floor(Math.random() * 2000) + 500,
      likes: Math.floor(Math.random() * 150) + 50,
      shares: Math.floor(Math.random() * 80) + 20,
    });
  }

  for (const blog of blogs) {
    const existing = await Blog.findOne({ "ar.slug": blog.ar.slug });
    if (!existing) {
      await Blog.create(blog);
      console.log(`✓ Created blog: ${blog.ar.title}`);
    }
  }
};

/* --------------------------------------------------
   SEED STATIC PAGES
--------------------------------------------------- */
const seedStaticPages = async () => {
  const pages = [
    // Privacy Policy - Arabic
    {
      pageType: "privacy_policy",
      language: "ar",
      title: "سياسة الخصوصية",
      slug: "privacy-policy",
      content: `<div class="privacy-policy">
<h1>سياسة الخصوصية</h1>
<p class="intro">خصوصيتك مهمة بالنسبة لنا. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك الشخصية عند استخدام موقعنا وخدماتنا.</p>

<h2>المعلومات التي نجمعها</h2>
<p>نقوم بجمع عدة أنواع من المعلومات لتقديم خدماتنا وتحسينها:</p>
<ul>
<li>معلومات الحساب: الاسم، عنوان البريد الإلكتروني، رقم الهاتف</li>
<li>معلومات الشحن: عنوان التوصيل الكامل</li>
<li>معلومات الدفع: نستخدم بوابات دفع آمنة ولا نحتفظ بمعلومات بطاقتك الائتمانية</li>
<li>معلومات الطلبات: تفاصيل المنتجات التي تشتريها</li>
<li>معلومات التصفح: عنوان IP، نوع المتصفح، الصفحات التي تزورها</li>
</ul>

<h2>كيف نستخدم معلوماتك</h2>
<p>نستخدم المعلومات التي نجمعها للأغراض التالية:</p>
<ul>
<li>معالجة وتنفيذ طلباتك</li>
<li>التواصل معك بخصوص طلباتك والعروض الخاصة</li>
<li>تحسين موقعنا وخدماتنا</li>
<li>منع الاحتيال وتعزيز الأمان</li>
<li>الامتثال للمتطلبات القانونية</li>
</ul>

<h2>حماية معلوماتك</h2>
<p>نستخدم إجراءات أمنية متقدمة لحماية معلوماتك الشخصية:</p>
<ul>
<li>تشفير SSL لجميع عمليات نقل البيانات</li>
<li>خوادم آمنة ومحمية بجدران نارية</li>
<li>وصول محدود للموظفين المصرح لهم فقط</li>
<li>مراقبة مستمرة للأنشطة المشبوهة</li>
</ul>

<h2>مشاركة المعلومات</h2>
<p>لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلومات محدودة مع:</p>
<ul>
<li>شركات الشحن لتوصيل طلباتك</li>
<li>بوابات الدفع لمعالجة المدفوعات</li>
<li>مزودي الخدمات الذين يساعدوننا في تشغيل الموقع</li>
<li>السلطات القانونية عند الضرورة القانونية</li>
</ul>

<h2>ملفات تعريف الارتباط (Cookies)</h2>
<p>نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح. يمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات متصفحك.</p>

<h2>حقوقك</h2>
<p>لديك الحق في:</p>
<ul>
<li>الوصول إلى معلوماتك الشخصية</li>
<li>تصحيح أو تحديث معلوماتك</li>
<li>حذف حسابك ومعلوماتك</li>
<li>الاعتراض على معالجة بياناتك</li>
<li>طلب نسخة من بياناتك</li>
</ul>

<h2>الاتصال بنا</h2>
<p>إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى الاتصال بنا عبر البريد الإلكتروني أو الهاتف.</p>

<p class="update-date">آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}</p>
</div>`,
      sections: [
        {
          heading: "المعلومات التي نجمعها",
          content: "نقوم بجمع المعلومات التي تقدمها لنا مباشرة، مثل اسمك وعنوان بريدك الإلكتروني ورقم هاتفك وعنوان الشحن عند إنشاء حساب أو تقديم طلب.",
          order: 1,
        },
        {
          heading: "كيف نستخدم معلوماتك",
          content: "نستخدم المعلومات التي نجمعها لمعالجة طلباتك، وتوفير دعم العملاء، وإرسال تحديثات حول طلباتك، وتحسين خدماتنا.",
          order: 2,
        },
        {
          heading: "حماية معلوماتك",
          content: "نستخدم تقنيات التشفير الحديثة وإجراءات أمنية متقدمة لحماية معلوماتك الشخصية من الوصول غير المصرح به.",
          order: 3,
        },
      ],
      seo: {
        metaTitle: "سياسة الخصوصية | متجر الأجهزة المنزلية",
        metaDescription: "اطلع على سياسة الخصوصية الخاصة بنا وكيفية حماية بياناتك الشخصية وحقوقك في التحكم بمعلوماتك",
        metaKeywords: ["خصوصية", "بيانات", "حماية", "أمان", "معلومات شخصية"],
        canonicalUrl: "/pages/privacy-policy",
      },
      status: "published",
    },

    // Privacy Policy - English
    {
      pageType: "privacy_policy",
      language: "en",
      title: "Privacy Policy",
      slug: "privacy-policy",
      content: `<div class="privacy-policy">
<h1>Privacy Policy</h1>
<p class="intro">Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information when you use our website and services.</p>

<h2>Information We Collect</h2>
<p>We collect several types of information to provide and improve our services:</p>
<ul>
<li>Account information: Name, email address, phone number</li>
<li>Shipping information: Complete delivery address</li>
<li>Payment information: We use secure payment gateways and don't store your credit card information</li>
<li>Order information: Details of products you purchase</li>
<li>Browsing information: IP address, browser type, pages you visit</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use the information we collect for the following purposes:</p>
<ul>
<li>Process and fulfill your orders</li>
<li>Communicate with you about your orders and special offers</li>
<li>Improve our website and services</li>
<li>Prevent fraud and enhance security</li>
<li>Comply with legal requirements</li>
</ul>

<h2>Protecting Your Information</h2>
<p>We use advanced security measures to protect your personal information:</p>
<ul>
<li>SSL encryption for all data transfers</li>
<li>Secure servers protected by firewalls</li>
<li>Limited access to authorized personnel only</li>
<li>Continuous monitoring for suspicious activities</li>
</ul>

<h2>Information Sharing</h2>
<p>We do not sell or rent your personal information to third parties. We may share limited information with:</p>
<ul>
<li>Shipping companies to deliver your orders</li>
<li>Payment gateways to process payments</li>
<li>Service providers who help us operate the website</li>
<li>Legal authorities when legally required</li>
</ul>

<h2>Cookies</h2>
<p>We use cookies to improve your browsing experience. You can control cookies through your browser settings.</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
<li>Access your personal information</li>
<li>Correct or update your information</li>
<li>Delete your account and information</li>
<li>Object to data processing</li>
<li>Request a copy of your data</li>
</ul>

<h2>Contact Us</h2>
<p>If you have any questions about our privacy policy, please contact us via email or phone.</p>

<p class="update-date">Last updated: ${new Date().toLocaleDateString('en-US')}</p>
</div>`,
      sections: [
        {
          heading: "Information We Collect",
          content: "We collect information you provide directly to us, such as your name, email address, phone number, and shipping address when you create an account or place an order.",
          order: 1,
        },
        {
          heading: "How We Use Your Information",
          content: "We use the information we collect to process your orders, provide customer support, send you updates about your orders, and improve our services.",
          order: 2,
        },
        {
          heading: "Protecting Your Information",
          content: "We use modern encryption technologies and advanced security measures to protect your personal information from unauthorized access.",
          order: 3,
        },
      ],
      seo: {
        metaTitle: "Privacy Policy | Home Appliances Store",
        metaDescription: "Read our privacy policy and learn how we protect your personal data and your rights to control your information",
        metaKeywords: ["privacy", "data", "protection", "security", "personal information"],
        canonicalUrl: "/pages/privacy-policy",
      },
      status: "published",
    },

    // Terms & Conditions - Arabic
    {
      pageType: "terms_conditions",
      language: "ar",
      title: "الشروط والأحكام",
      slug: "terms-conditions",
      content: `<h1>الشروط والأحكام</h1>
<p>توضح هذه الشروط والأحكام القواعد والأنظمة لاستخدام موقعنا وخدماتنا. باستخدامك لهذا الموقع، فإنك توافق على الالتزام بهذه الشروط.</p>

<h2>1. قبول الشروط</h2>
<p>من خلال الوصول إلى هذا الموقع واستخدامه، فإنك تقبل وتوافق على الالتزام بهذه الشروط والأحكام وسياسة الخصوصية.</p>

<h2>2. التسجيل والحساب</h2>
<ul>
<li>يجب أن تكون بعمر 18 عاماً أو أكثر للتسجيل</li>
<li>يجب تقديم معلومات دقيقة وكاملة</li>
<li>أنت مسؤول عن الحفاظ على سرية كلمة المرور</li>
<li>أنت مسؤول عن جميع الأنشطة التي تتم من حسابك</li>
</ul>

<h2>3. الطلبات والأسعار</h2>
<ul>
<li>جميع الطلبات تخضع للتوفر والتأكيد</li>
<li>نحتفظ بالحق في رفض أي طلب</li>
<li>الأسعار قابلة للتغيير دون إشعار مسبق</li>
<li>الأسعار لا تشمل رسوم التوصيل ما لم ينص على خلاف ذلك</li>
</ul>

<h2>4. الدفع</h2>
<p>نقبل طرق الدفع التالية:</p>
<ul>
<li>البطاقات الائتمانية (فيزا، ماستركارد)</li>
<li>الدفع عند الاستلام</li>
<li>التقسيط عبر تابي أو تمارا</li>
</ul>

<h2>5. التوصيل</h2>
<ul>
<li>نوصل إلى جميع أنحاء المملكة</li>
<li>مدة التوصيل 3-7 أيام عمل</li>
<li>رسوم التوصيل تختلف حسب المنطقة</li>
<li>توصيل مجاني للطلبات فوق 2000 ريال</li>
</ul>

<h2>6. الاسترجاع والاستبدال</h2>
<ul>
<li>يمكن إرجاع المنتجات خلال 14 يوماً</li>
<li>المنتج يجب أن يكون في حالته الأصلية</li>
<li>بعض المنتجات غير قابلة للإرجاع (حسب السياسة)</li>
</ul>`,
      sections: [
        {
          heading: "قبول الشروط",
          content: "من خلال الوصول إلى هذا الموقع واستخدامه، فإنك تقبل وتوافق على الالتزام بهذه الشروط والأحكام.",
          order: 1,
        },
        {
          heading: "الطلبات والمدفوعات",
          content: "جميع الطلبات تخضع للتوفر والتأكيد. نقبل جميع طرق الدفع الرئيسية بما في ذلك البطاقات الائتمانية والدفع عند الاستلام.",
          order: 2,
        },
      ],
      seo: {
        metaTitle: "الشروط والأحكام | متجر الأجهزة المنزلية",
        metaDescription: "اقرأ الشروط والأحكام الخاصة باستخدام موقعنا وشراء المنتجات",
        metaKeywords: ["شروط", "أحكام", "قوانين", "سياسات"],
        canonicalUrl: "/pages/terms-conditions",
      },
      status: "published",
    },

    // Terms & Conditions - English
    {
      pageType: "terms_conditions",
      language: "en",
      title: "Terms and Conditions",
      slug: "terms-conditions",
      content: `<h1>Terms and Conditions</h1>
<p>These terms and conditions outline the rules and regulations for the use of our website and services. By using this website, you agree to abide by these terms.</p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing and using this website, you accept and agree to be bound by these terms and conditions and our privacy policy.</p>

<h2>2. Registration and Account</h2>
<ul>
<li>You must be 18 years or older to register</li>
<li>You must provide accurate and complete information</li>
<li>You are responsible for maintaining password confidentiality</li>
<li>You are responsible for all activities from your account</li>
</ul>

<h2>3. Orders and Pricing</h2>
<ul>
<li>All orders are subject to availability and confirmation</li>
<li>We reserve the right to refuse any order</li>
<li>Prices are subject to change without prior notice</li>
<li>Prices exclude delivery charges unless stated otherwise</li>
</ul>

<h2>4. Payment</h2>
<p>We accept the following payment methods:</p>
<ul>
<li>Credit cards (Visa, Mastercard)</li>
<li>Cash on delivery</li>
<li>Installments via Tabby or Tamara</li>
</ul>

<h2>5. Delivery</h2>
<ul>
<li>We deliver nationwide</li>
<li>Delivery time 3-7 business days</li>
<li>Delivery charges vary by region</li>
<li>Free delivery for orders above SAR 2000</li>
</ul>

<h2>6. Returns and Exchanges</h2>
<ul>
<li>Products can be returned within 14 days</li>
<li>Product must be in original condition</li>
<li>Some products are non-returnable (as per policy)</li>
</ul>`,
      sections: [
        {
          heading: "Acceptance of Terms",
          content: "By accessing and using this website, you accept and agree to be bound by these terms and conditions.",
          order: 1,
        },
        {
          heading: "Orders and Payments",
          content: "All orders are subject to availability and confirmation. We accept all major payment methods including credit cards and cash on delivery.",
          order: 2,
        },
      ],
      seo: {
        metaTitle: "Terms and Conditions | Home Appliances Store",
        metaDescription: "Read the terms and conditions for using our website and purchasing products",
        metaKeywords: ["terms", "conditions", "rules", "policies"],
        canonicalUrl: "/pages/terms-conditions",
      },
      status: "published",
    },

    // About Us - Arabic
    {
      pageType: "about_us",
      language: "ar",
      title: "من نحن",
      slug: "about-us",
      content: `<h1>من نحن</h1>
<p>نحن مزود رائد للأجهزة المنزلية في المملكة، ملتزمون بتقديم منتجات عالية الجودة وخدمة ممتازة لعملائنا منذ عام 2015.</p>

<h2>رؤيتنا</h2>
<p>أن نكون الخيار الأول لكل عائلة في المملكة عند شراء الأجهزة المنزلية، من خلال تقديم أفضل المنتجات والأسعار والخدمات.</p>

<h2>مهمتنا</h2>
<ul>
<li>توفير أجهزة منزلية أصلية من علامات تجارية عالمية موثوقة</li>
<li>تقديم أسعار تنافسية تناسب جميع الميزانيات</li>
<li>ضمان توصيل سريع وآمن لجميع أنحاء المملكة</li>
<li>تقديم دعم ممتاز لما بعد البيع وخدمة عملاء على مدار الساعة</li>
</ul>

<h2>لماذا تختارنا؟</h2>
<ul>
<li><strong>منتجات أصلية 100%:</strong> نتعامل مع الموزعين المعتمدين فقط</li>
<li><strong>أفضل الأسعار:</strong> ضمان أفضل سعر في السوق</li>
<li><strong>ضمان شامل:</strong> جميع منتجاتنا مع ضمان من الشركة المصنعة</li>
<li><strong>توصيل مجاني:</strong> للطلبات فوق 2000 ريال</li>
<li><strong>دعم 24/7:</strong> فريق خدمة العملاء جاهز دائماً لمساعدتك</li>
</ul>

<h2>قصتنا</h2>
<p>بدأنا رحلتنا في 2015 بهدف بسيط: جعل الأجهزة المنزلية عالية الجودة في متناول الجميع. اليوم، نخدم آلاف العائلات في جميع أنحاء المملكة ونفتخر بثقتهم بنا.</p>`,
      sections: [
        {
          heading: "مهمتنا",
          content: "مهمتنا هي توفير أجهزة منزلية عالية الجودة بأسعار تنافسية، مع خدمة عملاء استثنائية وتوصيل على مستوى البلاد.",
          order: 1,
        },
        {
          heading: "لماذا تختارنا",
          content: "نقدم منتجات أصلية، وأسعار تنافسية، وتوصيل سريع، ودعم ممتاز لما بعد البيع. فريقنا مكرس لضمان رضاك.",
          order: 2,
        },
      ],
      seo: {
        metaTitle: "من نحن | متجر الأجهزة المنزلية الرائد في المملكة",
        metaDescription: "تعرف على قصتنا ورؤيتنا في مجال الأجهزة المنزلية. نخدم آلاف العائلات منذ 2015",
        metaKeywords: ["من نحن", "رؤية", "مهمة", "قصتنا"],
        canonicalUrl: "/pages/about-us",
      },
      status: "published",
    },

    // About Us - English
    {
      pageType: "about_us",
      language: "en",
      title: "About Us",
      slug: "about-us",
      content: `<h1>About Us</h1>
<p>We are a leading provider of home appliances in the Kingdom, committed to bringing quality products and excellent service to our customers since 2015.</p>

<h2>Our Vision</h2>
<p>To be the first choice for every family in the Kingdom when buying home appliances, by providing the best products, prices, and services.</p>

<h2>Our Mission</h2>
<ul>
<li>Provide authentic home appliances from trusted global brands</li>
<li>Offer competitive prices suitable for all budgets</li>
<li>Ensure fast and safe delivery nationwide</li>
<li>Provide excellent after-sales support and 24/7 customer service</li>
</ul>

<h2>Why Choose Us?</h2>
<ul>
<li><strong>100% Authentic Products:</strong> We deal with authorized distributors only</li>
<li><strong>Best Prices:</strong> Guaranteed best price in the market</li>
<li><strong>Comprehensive Warranty:</strong> All our products come with manufacturer's warranty</li>
<li><strong>Free Delivery:</strong> For orders above SAR 2000</li>
<li><strong>24/7 Support:</strong> Customer service team always ready to help</li>
</ul>

<h2>Our Story</h2>
<p>We started our journey in 2015 with a simple goal: make high-quality home appliances accessible to everyone. Today, we serve thousands of families across the Kingdom and are proud of their trust in us.</p>`,
      sections: [
        {
          heading: "Our Mission",
          content: "Our mission is to provide high-quality home appliances at competitive prices, with exceptional customer service and nationwide delivery.",
          order: 1,
        },
        {
          heading: "Why Choose Us",
          content: "We offer authentic products, competitive pricing, fast delivery, and excellent after-sales support. Our team is dedicated to ensuring your satisfaction.",
          order: 2,
        },
      ],
      seo: {
        metaTitle: "About Us | Leading Home Appliances Store in the Kingdom",
        metaDescription: "Learn about our story and vision in home appliances. Serving thousands of families since 2015",
        metaKeywords: ["about", "vision", "mission", "our story"],
        canonicalUrl: "/pages/about-us",
      },
      status: "published",
    },

    // Return & Exchange - Arabic
    {
      pageType: "return_exchange",
      language: "ar",
      title: "سياسة الاستبدال والاسترجاع",
      slug: "return-exchange-policy",
      content: `<h1>سياسة الاستبدال والاسترجاع</h1>
<p>نريد أن تكون راضياً تماماً عن مشترياتك. إذا لم تكن سعيداً بطلبك، فإننا نقدم سياسة استرجاع واستبدال خالية من المتاعب.</p>

<h2>فترة الإرجاع</h2>
<p>يمكنك إرجاع المنتجات خلال <strong>14 يوماً من تاريخ التسليم</strong> لاسترداد كامل المبلغ أو الاستبدال، بشرط أن يكون المنتج:</p>
<ul>
<li>في حالته الأصلية غير المستخدمة</li>
<li>مع جميع العبوات والملحقات الأصلية</li>
<li>مع الفاتورة الأصلية</li>
<li>بدون أي خدوش أو تلف</li>
</ul>

<h2>كيفية الإرجاع</h2>
<ol>
<li>اتصل بفريق خدمة العملاء على <strong>920012345</strong></li>
<li>قدم رقم الطلب وسبب الإرجاع</li>
<li>سنرتب الاستلام من عنوانك</li>
<li>سيتم فحص المنتج عند الاستلام</li>
<li>استرداد المبلغ خلال 7-10 أيام عمل</li>
</ol>

<h2>المنتجات غير القابلة للإرجاع</h2>
<ul>
<li>الأجهزة المستخدمة أو المركبة</li>
<li>المنتجات التالفة بسبب سوء الاستخدام</li>
<li>المنتجات المخصصة حسب الطلب</li>
<li>عروض التصفية النهائية</li>
</ul>

<h2>الاستبدال</h2>
<p>يمكنك استبدال المنتج بموديل آخر من نفس الفئة السعرية أو دفع الفرق في السعر.</p>

<h2>استرداد المبلغ</h2>
<ul>
<li>نفس طريقة الدفع الأصلية</li>
<li>خلال 7-10 أيام عمل من تأكيد الإرجاع</li>
<li>رسوم التوصيل الأصلية غير قابلة للاسترداد</li>
</ul>`,
      sections: [
        {
          heading: "فترة الإرجاع",
          content: "يمكنك إرجاع المنتجات خلال 14 يوماً من التسليم لاسترداد كامل المبلغ أو الاستبدال، بشرط أن يكون المنتج في حالته الأصلية مع جميع العبوات والملحقات.",
          order: 1,
        },
        {
          heading: "كيفية الإرجاع",
          content: "اتصل بفريق خدمة العملاء لدينا لبدء عملية الإرجاع. سنرتب الاستلام ونزودك برقم مرجعي للإرجاع.",
          order: 2,
        },
      ],
      seo: {
        metaTitle: "سياسة الاستبدال والاسترجاع | إرجاع سهل خلال 14 يوم",
        metaDescription: "تعرف على سياسة الاستبدال والاسترجاع الخاصة بنا. إرجاع مجاني خلال 14 يوم واسترداد كامل",
        metaKeywords: ["استبدال", "استرجاع", "ضمان", "إرجاع مجاني"],
        canonicalUrl: "/pages/return-exchange",
      },
      status: "published",
    },

    // Return & Exchange - English
    {
      pageType: "return_exchange",
      language: "en",
      title: "Return and Exchange Policy",
      slug: "return-exchange-policy",
      content: `<h1>Return and Exchange Policy</h1>
<p>We want you to be completely satisfied with your purchase. If you're not happy with your order, we offer a hassle-free return and exchange policy.</p>

<h2>Return Period</h2>
<p>You can return products within <strong>14 days of delivery</strong> for a full refund or exchange, provided the product is:</p>
<ul>
<li>In its original unused condition</li>
<li>With all original packaging and accessories</li>
<li>With original invoice</li>
<li>Without any scratches or damage</li>
</ul>

<h2>How to Return</h2>
<ol>
<li>Contact customer service team at <strong>920012345</strong></li>
<li>Provide order number and reason for return</li>
<li>We'll arrange pickup from your address</li>
<li>Product will be inspected upon pickup</li>
<li>Refund within 7-10 business days</li>
</ol>

<h2>Non-Returnable Products</h2>
<ul>
<li>Used or installed appliances</li>
<li>Products damaged due to misuse</li>
<li>Custom-made products</li>
<li>Final clearance items</li>
</ul>

<h2>Exchange</h2>
<p>You can exchange the product with another model from the same price category or pay the price difference.</p>

<h2>Refund</h2>
<ul>
<li>Same original payment method</li>
<li>Within 7-10 business days from return confirmation</li>
<li>Original delivery charges are non-refundable</li>
</ul>`,
      sections: [
        {
          heading: "Return Period",
          content: "You can return products within 14 days of delivery for a full refund or exchange, provided the product is in its original condition with all packaging and accessories.",
          order: 1,
        },
        {
          heading: "How to Return",
          content: "Contact our customer service team to initiate a return. We'll arrange for pickup and provide you with a return reference number.",
          order: 2,
        },
      ],
      seo: {
        metaTitle: "Return and Exchange Policy | Easy 14-Day Returns",
        metaDescription: "Learn about our return and exchange policy. Free returns within 14 days and full refund",
        metaKeywords: ["return", "exchange", "warranty", "free returns"],
        canonicalUrl: "/pages/return-exchange",
      },
      status: "published",
    },
  ];

  for (const page of pages) {
    const existing = await StaticPage.findOne({
      pageType: page.pageType,
      language: page.language,
    });
    if (!existing) {
      await StaticPage.create(page);
      console.log(`✓ Created page: ${page.title} (${page.language})`);
    }
  }
};

/* --------------------------------------------------
   SEED BRANCHES
--------------------------------------------------- */
const seedBranches = async () => {
  const standardWorkingHours = {
    sat: { open: "09:00", close: "22:00", isClosed: false },
    sun: { open: "09:00", close: "22:00", isClosed: false },
    mon: { open: "09:00", close: "22:00", isClosed: false },
    tue: { open: "09:00", close: "22:00", isClosed: false },
    wed: { open: "09:00", close: "22:00", isClosed: false },
    thu: { open: "09:00", close: "22:00", isClosed: false },
    fri: { open: "16:00", close: "22:00", isClosed: false },
  };

  const branches = [
    // Riyadh Branches
    {
      ar: {
        name: "فرع الرياض - العليا",
        address: "طريق الملك فهد، حي العليا، الرياض 12211",
        city: "الرياض",
        region: "منطقة الرياض",
        services: [
          "مبيعات",
          "خدمة ما بعد البيع",
          "الصيانة",
          "قطع الغيار",
          "التركيب المنزلي",
        ],
        description: "فرعنا الرئيسي في الرياض يقع في قلب حي العليا التجاري، يضم أحدث الأجهزة المنزلية وفريق متخصص من الخبراء.",
      },
      en: {
        name: "Riyadh Branch - Al Olaya",
        address: "King Fahd Road, Al Olaya District, Riyadh 12211",
        city: "Riyadh",
        region: "Riyadh Region",
        services: [
          "Sales",
          "After-sales Service",
          "Maintenance",
          "Spare Parts",
          "Home Installation",
        ],
        description: "Our main Riyadh branch located in the heart of Al Olaya commercial district, featuring the latest home appliances and a specialized team of experts.",
      },
      regionCode: "riyadh",
      latitude: 24.7136,
      longitude: 46.6753,
      phones: ["+966112345001", "+966112345002"],
      email: "riyadh.olaya@elba.sa",
      whatsapp: "+966501234001",
      workingHours: standardWorkingHours,
      manager: {
        name: "محمد العتيبي",
        phone: "+966501234101",
        email: "mohammed.alotaibi@elba.sa",
      },
      hasParking: true,
      hasDisabledAccess: true,
      hasCafeteria: true,
      hasShowroom: true,
      images: [
        {
          url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
          alt: "Riyadh Al Olaya Branch Exterior",
        },
      ],
      isFeatured: true,
      displayOrder: 1,
      isActive: true,
    },
    {
      ar: {
        name: "فرع الرياض - الملقا",
        address: "طريق عثمان بن عفان، حي الملقا، الرياض 13521",
        city: "الرياض",
        region: "منطقة الرياض",
        services: ["مبيعات", "خدمة العملاء", "الصيانة", "التوصيل"],
        description: "فرع حديث في حي الملقا يوفر تشكيلة واسعة من الأجهزة المنزلية مع خدمة توصيل سريعة.",
      },
      en: {
        name: "Riyadh Branch - Al Malqa",
        address: "Othman Ibn Affan Road, Al Malqa District, Riyadh 13521",
        city: "Riyadh",
        region: "Riyadh Region",
        services: ["Sales", "Customer Service", "Maintenance", "Delivery"],
        description: "Modern branch in Al Malqa offering a wide range of home appliances with fast delivery service.",
      },
      regionCode: "riyadh",
      latitude: 24.7858,
      longitude: 46.6441,
      phones: ["+966112345003"],
      email: "riyadh.malqa@elba.sa",
      whatsapp: "+966501234002",
      workingHours: standardWorkingHours,
      manager: {
        name: "أحمد السالم",
        phone: "+966501234102",
        email: "ahmed.alsalem@elba.sa",
      },
      hasParking: true,
      hasDisabledAccess: true,
      hasCafeteria: false,
      hasShowroom: true,
      displayOrder: 2,
      isActive: true,
    },

    // Jeddah Branches
    {
      ar: {
        name: "فرع جدة - التحلية",
        address: "شارع التحلية، حي التحلية، جدة 23424",
        city: "جدة",
        region: "منطقة مكة المكرمة",
        services: [
          "مبيعات",
          "خدمة ما بعد البيع",
          "الصيانة",
          "قطع الغيار",
        ],
        description: "فرع راقي على شارع التحلية الشهير، يقدم أفضل العلامات التجارية العالمية للأجهزة المنزلية.",
      },
      en: {
        name: "Jeddah Branch - Tahlia",
        address: "Tahlia Street, Tahlia District, Jeddah 23424",
        city: "Jeddah",
        region: "Makkah Region",
        services: ["Sales", "After-sales Service", "Maintenance", "Spare Parts"],
        description: "Premium branch on the famous Tahlia Street, offering the best international brands of home appliances.",
      },
      regionCode: "makkah",
      latitude: 21.5433,
      longitude: 39.1728,
      phones: ["+966122345001", "+966122345002"],
      email: "jeddah.tahlia@elba.sa",
      whatsapp: "+966501234003",
      workingHours: standardWorkingHours,
      manager: {
        name: "خالد الغامدي",
        phone: "+966501234103",
        email: "khaled.alghamdi@elba.sa",
      },
      hasParking: true,
      hasDisabledAccess: true,
      hasCafeteria: true,
      hasShowroom: true,
      isFeatured: true,
      displayOrder: 3,
      isActive: true,
    },
    {
      ar: {
        name: "فرع جدة - الروضة",
        address: "شارع الأمير سلطان، حي الروضة، جدة 23431",
        city: "جدة",
        region: "منطقة مكة المكرمة",
        services: ["مبيعات", "الصيانة", "التوصيل السريع"],
        description: "فرع في حي الروضة يوفر خدمات شاملة مع فريق صيانة متخصص.",
      },
      en: {
        name: "Jeddah Branch - Al Rawdah",
        address: "Prince Sultan Street, Al Rawdah District, Jeddah 23431",
        city: "Jeddah",
        region: "Makkah Region",
        services: ["Sales", "Maintenance", "Express Delivery"],
        description: "Branch in Al Rawdah providing comprehensive services with a specialized maintenance team.",
      },
      regionCode: "makkah",
      latitude: 21.5619,
      longitude: 39.1467,
      phones: ["+966122345003"],
      email: "jeddah.rawdah@elba.sa",
      whatsapp: "+966501234004",
      workingHours: standardWorkingHours,
      hasParking: true,
      hasDisabledAccess: false,
      hasCafeteria: false,
      hasShowroom: true,
      displayOrder: 4,
      isActive: true,
    },

    // Dammam Branch
    {
      ar: {
        name: "فرع الدمام - الشاطئ",
        address: "طريق الملك عبدالله، حي الشاطئ الشرقي، الدمام 32415",
        city: "الدمام",
        region: "المنطقة الشرقية",
        services: [
          "مبيعات",
          "خدمة ما بعد البيع",
          "الصيانة",
          "التركيب",
        ],
        description: "فرع رئيسي في المنطقة الشرقية يخدم مدن الدمام والخبر والظهران.",
      },
      en: {
        name: "Dammam Branch - Ash Shati",
        address: "King Abdullah Road, Ash Shati Ash Sharqi, Dammam 32415",
        city: "Dammam",
        region: "Eastern Region",
        services: ["Sales", "After-sales Service", "Maintenance", "Installation"],
        description: "Main branch in the Eastern Province serving Dammam, Khobar, and Dhahran cities.",
      },
      regionCode: "eastern",
      latitude: 26.4367,
      longitude: 50.1039,
      phones: ["+966133345001", "+966133345002"],
      email: "dammam.shati@elba.sa",
      whatsapp: "+966501234005",
      workingHours: standardWorkingHours,
      manager: {
        name: "سعد الدوسري",
        phone: "+966501234104",
        email: "saad.aldosari@elba.sa",
      },
      hasParking: true,
      hasDisabledAccess: true,
      hasCafeteria: false,
      hasShowroom: true,
      isFeatured: true,
      displayOrder: 5,
      isActive: true,
    },

    // Makkah Branch
    {
      ar: {
        name: "فرع مكة المكرمة - العزيزية",
        address: "شارع إبراهيم الخليل، حي العزيزية، مكة المكرمة 24231",
        city: "مكة المكرمة",
        region: "منطقة مكة المكرمة",
        services: ["مبيعات", "الصيانة", "قطع الغيار"],
        description: "فرعنا في مكة المكرمة يخدم المواطنين والمقيمين بأحدث الأجهزة المنزلية.",
      },
      en: {
        name: "Makkah Branch - Al Aziziyah",
        address: "Ibrahim Al Khalil Street, Al Aziziyah, Makkah 24231",
        city: "Makkah",
        region: "Makkah Region",
        services: ["Sales", "Maintenance", "Spare Parts"],
        description: "Our Makkah branch serving citizens and residents with the latest home appliances.",
      },
      regionCode: "makkah",
      latitude: 21.3891,
      longitude: 39.8579,
      phones: ["+966125345001"],
      email: "makkah.aziziyah@elba.sa",
      whatsapp: "+966501234006",
      workingHours: standardWorkingHours,
      hasParking: true,
      hasDisabledAccess: true,
      hasCafeteria: false,
      hasShowroom: true,
      displayOrder: 6,
      isActive: true,
    },

    // Madinah Branch
    {
      ar: {
        name: "فرع المدينة المنورة - العزيزية",
        address: "طريق الملك عبدالعزيز، حي العزيزية، المدينة المنورة 42351",
        city: "المدينة المنورة",
        region: "منطقة المدينة المنورة",
        services: ["مبيعات", "خدمة العملاء", "الصيانة"],
        description: "فرع المدينة المنورة يقدم خدمات متميزة لسكان المدينة.",
      },
      en: {
        name: "Madinah Branch - Al Aziziyah",
        address: "King Abdulaziz Road, Al Aziziyah, Madinah 42351",
        city: "Madinah",
        region: "Madinah Region",
        services: ["Sales", "Customer Service", "Maintenance"],
        description: "Madinah branch providing excellent services to city residents.",
      },
      regionCode: "madinah",
      latitude: 24.4672,
      longitude: 39.6142,
      phones: ["+966148345001"],
      email: "madinah.aziziyah@elba.sa",
      whatsapp: "+966501234007",
      workingHours: standardWorkingHours,
      hasParking: true,
      hasDisabledAccess: true,
      hasCafeteria: false,
      hasShowroom: true,
      displayOrder: 7,
      isActive: true,
    },

    // Khobar Branch
    {
      ar: {
        name: "فرع الخبر - الكورنيش",
        address: "طريق الكورنيش، حي الكورنيش الشمالي، الخبر 34446",
        city: "الخبر",
        region: "المنطقة الشرقية",
        services: ["مبيعات", "الصيانة", "التوصيل"],
        description: "فرع على كورنيش الخبر مع إطلالة بحرية رائعة ومعرض واسع.",
      },
      en: {
        name: "Khobar Branch - Corniche",
        address: "Corniche Road, North Corniche District, Khobar 34446",
        city: "Khobar",
        region: "Eastern Region",
        services: ["Sales", "Maintenance", "Delivery"],
        description: "Branch on Khobar Corniche with beautiful sea view and spacious showroom.",
      },
      regionCode: "eastern",
      latitude: 26.2885,
      longitude: 50.2080,
      phones: ["+966138345001"],
      email: "khobar.corniche@elba.sa",
      whatsapp: "+966501234008",
      workingHours: standardWorkingHours,
      hasParking: true,
      hasDisabledAccess: true,
      hasCafeteria: true,
      hasShowroom: true,
      displayOrder: 8,
      isActive: true,
    },

    // Taif Branch
    {
      ar: {
        name: "فرع الطائف - الشفا",
        address: "طريق الملك فيصل، حي الشفا، الطائف 26513",
        city: "الطائف",
        region: "منطقة مكة المكرمة",
        services: ["مبيعات", "الصيانة"],
        description: "فرع الطائف في منطقة الشفا يخدم أهالي الطائف والمصطافين.",
      },
      en: {
        name: "Taif Branch - Ash Shafa",
        address: "King Faisal Road, Ash Shafa District, Taif 26513",
        city: "Taif",
        region: "Makkah Region",
        services: ["Sales", "Maintenance"],
        description: "Taif branch in Ash Shafa area serving Taif residents and vacationers.",
      },
      regionCode: "makkah",
      latitude: 21.2622,
      longitude: 40.4150,
      phones: ["+966127345001"],
      email: "taif.shafa@elba.sa",
      whatsapp: "+966501234009",
      workingHours: standardWorkingHours,
      hasParking: true,
      hasDisabledAccess: false,
      hasCafeteria: false,
      hasShowroom: true,
      displayOrder: 9,
      isActive: true,
    },

    // Abha Branch
    {
      ar: {
        name: "فرع أبها - المنسك",
        address: "طريق الملك فهد، حي المنسك، أبها 62521",
        city: "أبها",
        region: "منطقة عسير",
        services: ["مبيعات", "خدمة العملاء", "الصيانة"],
        description: "فرع أبها في قلب المدينة يوفر أفضل الأجهزة المنزلية لمنطقة عسير.",
      },
      en: {
        name: "Abha Branch - Al Mansak",
        address: "King Fahd Road, Al Mansak District, Abha 62521",
        city: "Abha",
        region: "Asir Region",
        services: ["Sales", "Customer Service", "Maintenance"],
        description: "Abha branch in the heart of the city providing the best home appliances for Asir region.",
      },
      regionCode: "asir",
      latitude: 18.2164,
      longitude: 42.5053,
      phones: ["+966172345001"],
      email: "abha.mansak@elba.sa",
      whatsapp: "+966501234010",
      workingHours: standardWorkingHours,
      hasParking: true,
      hasDisabledAccess: true,
      hasCafeteria: false,
      hasShowroom: true,
      displayOrder: 10,
      isActive: true,
    },
  ];

  for (const branch of branches) {
    const existing = await Branch.findOne({
      "en.name": branch.en.name,
    });
    if (!existing) {
      await Branch.create(branch);
      console.log(`✓ Created branch: ${branch.en.name}`);
    }
  }
};

/* --------------------------------------------------
   RUN ALL SEEDERS
--------------------------------------------------- */
export const runSeeder = async () => {
  try {
    console.log("\n🌱 Starting database seeding...\n");

    await seedCategories();
    console.log("");

    await seedBrands();
    console.log("");

    await seedProducts();
    console.log("");

    await seedBlogs();
    console.log("");

    await seedStaticPages();
    console.log("");

    await seedBranches();
    console.log("");

    console.log("✅ Database seeding completed successfully!\n");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
};

export default runSeeder;
