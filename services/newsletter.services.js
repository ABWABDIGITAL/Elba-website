import Newsletter from "../models/newsletter.model.js";
import Product from "../models/product.model.js";
import { sendWhatsAppMessage } from "./whatsapp.services.js";
import { sendEmail } from "../utlis/sendEmail.js";
import ApiError, { BadRequest, NotFound } from "../utlis/apiError.js";

/* --------------------------------------------------
   SUBSCRIBE TO NEWSLETTER
--------------------------------------------------- */
export const subscribeToNewsletter = async (data) => {
  try {
    const { email, phone, name, preferences, source } = data;

    // Check if already subscribed
    const existing = await Newsletter.findOne({ email });

    if (existing) {
      // If exists but inactive, reactivate
      if (!existing.isActive) {
        existing.isActive = true;
        existing.phone = phone || existing.phone;
        existing.name = name || existing.name;
        if (preferences) {
          existing.preferences = { ...existing.preferences, ...preferences };
        }
        await existing.save();
        return {
          success: true,
          message: "Subscription reactivated successfully",
          data: existing,
        };
      }

      throw BadRequest("Email already subscribed to newsletter");
    }

    // Create new subscription
    const subscription = await Newsletter.create({
      email,
      phone,
      name,
      preferences: preferences || {},
      source: source || "website",
    });

    return {
      success: true,
      message: "Successfully subscribed to newsletter",
      data: subscription,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || "Failed to subscribe");
  }
};

/* --------------------------------------------------
   UNSUBSCRIBE FROM NEWSLETTER
--------------------------------------------------- */
export const unsubscribeFromNewsletter = async (email) => {
  try {
    const subscription = await Newsletter.findOne({ email });

    if (!subscription) {
      throw NotFound("Subscription not found");
    }

    subscription.isActive = false;
    await subscription.save();

    return {
      success: true,
      message: "Successfully unsubscribed from newsletter",
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || "Failed to unsubscribe");
  }
};

/* --------------------------------------------------
   UPDATE NEWSLETTER PREFERENCES
--------------------------------------------------- */
export const updateNewsletterPreferences = async (email, preferences) => {
  try {
    const subscription = await Newsletter.findOne({ email });

    if (!subscription) {
      throw NotFound("Subscription not found");
    }

    subscription.preferences = { ...subscription.preferences, ...preferences };
    await subscription.save();

    return {
      success: true,
      message: "Preferences updated successfully",
      data: subscription,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || "Failed to update preferences");
  }
};

/* --------------------------------------------------
   GET TOP 3 DISCOUNTED PRODUCTS
--------------------------------------------------- */
export const getTop3DiscountedProducts = async () => {
  try {
    const products = await Product.find({
      status: "active",
      discountPrice: { $gt: 0 },
    })
      .populate("category", "ar.name en.name")
      .populate("brand", "ar.name en.name")
      .sort({ discountPercentage: -1, discountPrice: -1 })
      .limit(3)
      .lean();

    return products;
  } catch (error) {
    throw new Error("Failed to fetch discounted products");
  }
};

/* --------------------------------------------------
   GENERATE EMAIL HTML FOR PRODUCTS
--------------------------------------------------- */
const generateProductEmailHTML = (products, language = "ar") => {
  const isArabic = language === "ar";
  const direction = isArabic ? "rtl" : "ltr";

  const productsHTML = products
    .map((product, index) => {
      const title = isArabic ? product.ar?.title : product.en?.title;
      const brandName = isArabic ? product.brand?.ar?.name : product.brand?.en?.name;
      const categoryName = isArabic ? product.category?.ar?.name : product.category?.en?.name;
      const imageUrl = product.images?.[0]?.url || "https://via.placeholder.com/300";
      const finalPrice = product.price - product.discountPrice;

      return `
        <div style="background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
            <h2 style="margin: 0; font-size: 20px;">🏆 ${isArabic ? 'أفضل عرض' : 'Top Offer'} #${index + 1}</h2>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td width="40%" style="vertical-align: top; padding-${isArabic ? 'left' : 'right'}: 20px;">
                <img src="${imageUrl}" alt="${title}" style="width: 100%; max-width: 200px; border-radius: 8px; display: block;" />
              </td>
              <td width="60%" style="vertical-align: top;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${title}</h3>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">
                  <strong>${isArabic ? 'العلامة التجارية' : 'Brand'}:</strong> ${brandName || 'N/A'}
                </p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">
                  <strong>${isArabic ? 'الفئة' : 'Category'}:</strong> ${categoryName || 'N/A'}
                </p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">
                  <strong>SKU:</strong> ${product.sku}
                </p>

                <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 28px; font-weight: bold; color: #e74c3c;">${finalPrice.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}</span>
                    <span style="font-size: 18px; color: #999; text-decoration: line-through;">${product.price.toFixed(2)}</span>
                  </div>
                  <div style="background: #e74c3c; color: white; padding: 8px 15px; border-radius: 20px; display: inline-block; font-weight: bold; font-size: 16px;">
                    🔥 ${isArabic ? 'وفر' : 'Save'} ${product.discountPrice.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'} (${product.discountPercentage.toFixed(0)}%)
                  </div>
                </div>

                <a href="${process.env.FRONTEND_URL || 'https://elba.com'}/products/${product.slug}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 10px;">
                  ${isArabic ? 'اشتري الآن 🛒' : 'Shop Now 🛒'}
                </a>
              </td>
            </tr>
          </table>
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html dir="${direction}" lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isArabic ? 'أفضل العروض اليوم' : 'Today\'s Best Deals'}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 32px;">
                    ${isArabic ? '🎁 أفضل العروض اليوم!' : '🎁 Today\'s Best Deals!'}
                  </h1>
                  <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">
                    ${isArabic ? 'عروض حصرية وخصومات مذهلة على أفضل المنتجات' : 'Exclusive offers and amazing discounts on top products'}
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 30px 20px;">
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    ${isArabic
                      ? 'مرحباً! 👋<br><br>نقدم لك أفضل 3 عروض مميزة اليوم مع خصومات تصل إلى 50٪! لا تفوت هذه الفرصة الرائعة.'
                      : 'Hello! 👋<br><br>Here are our top 3 exclusive deals today with discounts up to 50%! Don\'t miss this amazing opportunity.'}
                  </p>

                  ${productsHTML}

                  <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #eee;">
                    <a href="${process.env.FRONTEND_URL || 'https://elba.com'}/products"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px;">
                      ${isArabic ? 'تصفح جميع العروض 🛍️' : 'Browse All Deals 🛍️'}
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px 20px; text-align: center;">
                  <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
                    ${isArabic ? 'شكراً لاشتراكك في نشرتنا الإخبارية' : 'Thank you for subscribing to our newsletter'}
                  </p>
                  <p style="color: #999; font-size: 12px; margin: 5px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://elba.com'}/newsletter/unsubscribe" style="color: #667eea; text-decoration: none;">
                      ${isArabic ? 'إلغاء الاشتراك' : 'Unsubscribe'}
                    </a>
                  </p>
                  <p style="color: #999; font-size: 12px; margin: 15px 0 0 0;">
                    © ${new Date().getFullYear()} Elba. ${isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/* --------------------------------------------------
   GENERATE WHATSAPP MESSAGE FOR PRODUCTS
--------------------------------------------------- */
const generateProductWhatsAppMessage = (products, language = "ar") => {
  const isArabic = language === "ar";

  const header = isArabic
    ? "🎁 *أفضل العروض اليوم!*\n\nعروض حصرية وخصومات مذهلة 🔥\n\n"
    : "🎁 *Today's Best Deals!*\n\nExclusive offers and amazing discounts 🔥\n\n";

  const productsText = products.map((product, index) => {
    const title = isArabic ? product.ar?.title : product.en?.title;
    const finalPrice = product.price - product.discountPrice;

    return `*${index + 1}. ${title}*\n` +
           `💰 ${isArabic ? 'السعر' : 'Price'}: ${finalPrice.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}\n` +
           `~~${product.price.toFixed(2)}~~ ➡️ *${product.discountPercentage.toFixed(0)}%* ${isArabic ? 'خصم' : 'OFF'}\n` +
           `🏷️ ${isArabic ? 'وفر' : 'Save'}: ${product.discountPrice.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}\n` +
           `🔗 ${process.env.FRONTEND_URL || 'https://elba.com'}/products/${product.slug}\n`;
  }).join("\n");

  const footer = isArabic
    ? `\n🛍️ *تسوق الآن واستفد من هذه العروض الرائعة!*\n\n${process.env.FRONTEND_URL || 'https://elba.com'}/products`
    : `\n🛍️ *Shop now and take advantage of these amazing deals!*\n\n${process.env.FRONTEND_URL || 'https://elba.com'}/products`;

  return header + productsText + footer;
};

/* --------------------------------------------------
   SEND NEWSLETTER TO ALL SUBSCRIBERS
--------------------------------------------------- */
export const sendNewsletterToSubscribers = async () => {
  try {
    // Get top 3 discounted products
    const products = await getTop3DiscountedProducts();

    if (products.length === 0) {
      return {
        success: false,
        message: "No discounted products available to send",
      };
    }

    // Get all active subscribers
    const subscribers = await Newsletter.find({ isActive: true }).lean();

    if (subscribers.length === 0) {
      return {
        success: false,
        message: "No active subscribers found",
      };
    }

    const results = {
      totalSubscribers: subscribers.length,
      emailSent: 0,
      emailFailed: 0,
      whatsappSent: 0,
      whatsappFailed: 0,
      errors: [],
    };

    // Send to each subscriber
    for (const subscriber of subscribers) {
      const language = subscriber.preferences?.language || "ar";

      // Send Email
      if (subscriber.preferences?.receiveEmail !== false && subscriber.email) {
        try {
          const emailHTML = generateProductEmailHTML(products, language);
          const subject = language === "ar"
            ? "🎁 أفضل العروض اليوم - خصومات تصل إلى 50٪!"
            : "🎁 Today's Best Deals - Up to 50% Off!";

          await sendEmail({
            to: subscriber.email,
            subject,
            message: emailHTML,
          });

          results.emailSent++;

          // Update subscriber stats
          await Newsletter.updateOne(
            { _id: subscriber._id },
            {
              $set: { lastSentAt: new Date() },
              $inc: { totalSent: 1 },
            }
          );
        } catch (error) {
          results.emailFailed++;
          results.errors.push({
            email: subscriber.email,
            type: "email",
            error: error.message,
          });
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Send WhatsApp
      if (subscriber.preferences?.receiveWhatsApp && subscriber.phone) {
        try {
          const whatsappMessage = generateProductWhatsAppMessage(products, language);
          const whatsappResult = await sendWhatsAppMessage(subscriber.phone, whatsappMessage);

          if (whatsappResult.success) {
            results.whatsappSent++;
          } else {
            results.whatsappFailed++;
            results.errors.push({
              phone: subscriber.phone,
              type: "whatsapp",
              error: whatsappResult.error,
            });
          }

          // Update subscriber stats
          await Newsletter.updateOne(
            { _id: subscriber._id },
            {
              $set: { lastSentAt: new Date() },
              $inc: { totalSent: 1 },
            }
          );
        } catch (error) {
          results.whatsappFailed++;
          results.errors.push({
            phone: subscriber.phone,
            type: "whatsapp",
            error: error.message,
          });
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      message: "Newsletter sent successfully",
      products: products.map(p => ({
        title: p.ar?.title || p.en?.title,
        sku: p.sku,
        discount: `${p.discountPercentage.toFixed(0)}%`,
      })),
      results,
    };
  } catch (error) {
    throw new Error(error.message || "Failed to send newsletter");
  }
};

/* --------------------------------------------------
   GET ALL SUBSCRIBERS (ADMIN)
--------------------------------------------------- */
export const getAllSubscribers = async (query) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === "true";
    }

    const [subscribers, total] = await Promise.all([
      Newsletter.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Newsletter.countDocuments(filter),
    ]);

    return {
      success: true,
      data: subscribers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new Error(error.message || "Failed to fetch subscribers");
  }
};

/* --------------------------------------------------
   DELETE SUBSCRIBER (ADMIN)
--------------------------------------------------- */
export const deleteSubscriber = async (id) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(id);

    if (!subscriber) {
      throw NotFound("Subscriber not found");
    }

    return {
      success: true,
      message: "Subscriber deleted successfully",
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || "Failed to delete subscriber");
  }
};
