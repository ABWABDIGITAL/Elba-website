import StaticPage from "../models/staticPage.model.js";
import redis from "../config/redis.js";
import { NotFound, ServerError } from "../utlis/apiError.js";

const PAGE_CACHE_PREFIX = "page:";
const CACHE_TTL = 3600; // 1 hour

/* --------------------------------------------------
   BUILD PAGE DTO
--------------------------------------------------- */
const buildPageDTO = (page, language = "ar") => ({
  id: page._id,
  pageType: page.pageType,
  title: page.title[language],
  slug: page.slug[language],
  content: page.content[language],
  sections: page.sections?.map(section => ({
    heading: section.heading[language],
    content: section.content[language],
    order: section.order,
  })),
  seo: {
    metaTitle: page.seo?.metaTitle?.[language],
    metaDescription: page.seo?.metaDescription?.[language],
    metaKeywords: page.seo?.metaKeywords?.[language],
    canonicalUrl: page.seo?.canonicalUrl,
    noindex: page.seo?.noindex,
    nofollow: page.seo?.nofollow,
  },
  lastReviewedDate: page.lastReviewedDate,
  version: page.version,
  publishedAt: page.publishedAt,
  updatedAt: page.updatedAt,
});

/* --------------------------------------------------
   GET PAGE BY TYPE (PUBLIC)
--------------------------------------------------- */
export const getPageByTypeService = async (pageType, language = "ar") => {
  try {
    const cacheKey = `${PAGE_CACHE_PREFIX}${pageType}:${language}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const page = await StaticPage.getByType(pageType);

    if (!page) {
      throw NotFound(`Page not found: ${pageType}`);
    }

    const result = buildPageDTO(page, language);

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to get page", err);
  }
};

/* --------------------------------------------------
   GET ALL PAGES (PUBLIC)
--------------------------------------------------- */
export const getAllPagesService = async (language = "ar") => {
  try {
    const cacheKey = `${PAGE_CACHE_PREFIX}all:${language}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const pages = await StaticPage.getAllPublished();
    const result = pages.map(page => buildPageDTO(page, language));

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    throw ServerError("Failed to get pages", err);
  }
};

/* --------------------------------------------------
   GET PAGE BY ID (ADMIN)
--------------------------------------------------- */
export const getPageByIdService = async (pageId) => {
  try {
    const page = await StaticPage.findById(pageId)
      .populate("lastUpdatedBy", "name email")
      .lean();

    if (!page) {
      throw NotFound("Page not found");
    }

    return page;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to get page", err);
  }
};

/* --------------------------------------------------
   CREATE PAGE (ADMIN)
--------------------------------------------------- */
export const createPageService = async (pageData, userId) => {
  try {
    const page = await StaticPage.create({
      ...pageData,
      lastUpdatedBy: userId,
    });

    // Clear cache
    await redis.del(`${PAGE_CACHE_PREFIX}*`);

    return page;
  } catch (err) {
    throw ServerError("Failed to create page", err);
  }
};

/* --------------------------------------------------
   UPDATE PAGE (ADMIN)
--------------------------------------------------- */
export const updatePageService = async (pageId, updates, userId) => {
  try {
    const page = await StaticPage.findByIdAndUpdate(
      pageId,
      {
        ...updates,
        lastUpdatedBy: userId,
      },
      { new: true, runValidators: true }
    ).populate("lastUpdatedBy", "name email");

    if (!page) {
      throw NotFound("Page not found");
    }

    // Clear cache
    await redis.del(`${PAGE_CACHE_PREFIX}*`);

    return page;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to update page", err);
  }
};

/* --------------------------------------------------
   DELETE PAGE (ADMIN)
--------------------------------------------------- */
export const deletePageService = async (pageId) => {
  try {
    const page = await StaticPage.findByIdAndUpdate(
      pageId,
      { isActive: false },
      { new: true }
    );

    if (!page) {
      throw NotFound("Page not found");
    }

    // Clear cache
    await redis.del(`${PAGE_CACHE_PREFIX}*`);

    return page;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    throw ServerError("Failed to delete page", err);
  }
};

/* --------------------------------------------------
   SEED DEFAULT PAGES
--------------------------------------------------- */
export const seedDefaultPagesService = async () => {
  try {
    const defaultPages = [
      {
        pageType: "privacy_policy",
        title: {
          en: "Privacy Policy",
          ar: "سياسة الخصوصية",
        },
        content: {
          en: "Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information when you use our website and services...",
          ar: "خصوصيتك مهمة بالنسبة لنا. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك الشخصية عند استخدام موقعنا وخدماتنا...",
        },
        sections: [
          {
            heading: {
              en: "Information We Collect",
              ar: "المعلومات التي نجمعها",
            },
            content: {
              en: "We collect information you provide directly to us, such as your name, email address, phone number, and shipping address when you create an account or place an order.",
              ar: "نقوم بجمع المعلومات التي تقدمها لنا مباشرة، مثل اسمك وعنوان بريدك الإلكتروني ورقم هاتفك وعنوان الشحن عند إنشاء حساب أو تقديم طلب.",
            },
            order: 1,
          },
          {
            heading: {
              en: "How We Use Your Information",
              ar: "كيف نستخدم معلوماتك",
            },
            content: {
              en: "We use the information we collect to process your orders, provide customer support, send you updates about your orders, and improve our services.",
              ar: "نستخدم المعلومات التي نجمعها لمعالجة طلباتك، وتوفير دعم العملاء، وإرسال تحديثات حول طلباتك، وتحسين خدماتنا.",
            },
            order: 2,
          },
        ],
        status: "published",
      },
      {
        pageType: "terms_conditions",
        title: {
          en: "Terms and Conditions",
          ar: "الشروط والأحكام",
        },
        content: {
          en: "These terms and conditions outline the rules and regulations for the use of our website and services...",
          ar: "توضح هذه الشروط والأحكام القواعد والأنظمة لاستخدام موقعنا وخدماتنا...",
        },
        sections: [
          {
            heading: {
              en: "Acceptance of Terms",
              ar: "قبول الشروط",
            },
            content: {
              en: "By accessing and using this website, you accept and agree to be bound by these terms and conditions.",
              ar: "من خلال الوصول إلى هذا الموقع واستخدامه، فإنك تقبل وتوافق على الالتزام بهذه الشروط والأحكام.",
            },
            order: 1,
          },
        ],
        status: "published",
      },
      {
        pageType: "about_us",
        title: {
          en: "About Us",
          ar: "من نحن",
        },
        content: {
          en: "We are a leading provider of home appliances across multiple regions, committed to bringing quality products and excellent service to our customers...",
          ar: "نحن مزود رائد للأجهزة المنزلية في مناطق متعددة، ملتزمون بتقديم منتجات عالية الجودة وخدمة ممتازة لعملائنا...",
        },
        sections: [
          {
            heading: {
              en: "Our Mission",
              ar: "مهمتنا",
            },
            content: {
              en: "Our mission is to provide high-quality home appliances at competitive prices, with exceptional customer service and nationwide delivery.",
              ar: "مهمتنا هي توفير أجهزة منزلية عالية الجودة بأسعار تنافسية، مع خدمة عملاء استثنائية وتوصيل على مستوى البلاد.",
            },
            order: 1,
          },
          {
            heading: {
              en: "Why Choose Us",
              ar: "لماذا تختارنا",
            },
            content: {
              en: "We offer authentic products, competitive pricing, fast delivery, and excellent after-sales support. Our team is dedicated to ensuring your satisfaction.",
              ar: "نقدم منتجات أصلية، وأسعار تنافسية، وتوصيل سريع، ودعم ممتاز لما بعد البيع. فريقنا مكرس لضمان رضاك.",
            },
            order: 2,
          },
        ],
        status: "published",
      },
      {
        pageType: "return_exchange",
        title: {
          en: "Return and Exchange Policy",
          ar: "سياسة الاستبدال والاسترجاع",
        },
        content: {
          en: "We want you to be completely satisfied with your purchase. If you're not happy with your order, we offer a hassle-free return and exchange policy...",
          ar: "نريد أن تكون راضيًا تمامًا عن مشترياتك. إذا لم تكن سعيدًا بطلبك، فإننا نقدم سياسة استرجاع واستبدال خالية من المتاعب...",
        },
        sections: [
          {
            heading: {
              en: "Return Period",
              ar: "فترة الإرجاع",
            },
            content: {
              en: "You can return products within 14 days of delivery for a full refund or exchange, provided the product is in its original condition with all packaging and accessories.",
              ar: "يمكنك إرجاع المنتجات خلال 14 يومًا من التسليم لاسترداد كامل المبلغ أو الاستبدال، بشرط أن يكون المنتج في حالته الأصلية مع جميع العبوات والملحقات.",
            },
            order: 1,
          },
          {
            heading: {
              en: "How to Return",
              ar: "كيفية الإرجاع",
            },
            content: {
              en: "Contact our customer service team to initiate a return. We'll arrange for pickup and provide you with a return reference number.",
              ar: "اتصل بفريق خدمة العملاء لدينا لبدء عملية الإرجاع. سنرتب الاستلام ونزودك برقم مرجعي للإرجاع.",
            },
            order: 2,
          },
        ],
        status: "published",
      },
    ];

    for (const pageData of defaultPages) {
      const existing = await StaticPage.findOne({ pageType: pageData.pageType });
      if (!existing) {
        await StaticPage.create(pageData);
        console.log(`Created default page: ${pageData.pageType}`);
      }
    }

    return {
      OK: true,
      message: "Default pages seeded successfully",
    };
  } catch (err) {
    throw ServerError("Failed to seed default pages", err);
  }
};
