import {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  updateNewsletterPreferences,
  sendNewsletterToSubscribers,
  getAllSubscribers,
  deleteSubscriber,
  getTop3DiscountedProducts,
} from "../services/newsletter.services.js";

/* --------------------------------------------------
   SUBSCRIBE TO NEWSLETTER (PUBLIC)
--------------------------------------------------- */
export const subscribeController = async (req, res, next) => {
  try {
    const { email, phone, name, preferences } = req.body;

    const result = await subscribeToNewsletter({
      email,
      phone,
      name,
      preferences,
      source: req.body.source || "website",
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   UNSUBSCRIBE FROM NEWSLETTER (PUBLIC)
--------------------------------------------------- */
export const unsubscribeController = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await unsubscribeFromNewsletter(email);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   UPDATE PREFERENCES (PUBLIC)
--------------------------------------------------- */
export const updatePreferencesController = async (req, res, next) => {
  try {
    const { email, preferences } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await updateNewsletterPreferences(email, preferences);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   GET TOP DISCOUNTED PRODUCTS (PUBLIC/PREVIEW)
--------------------------------------------------- */
export const getTopDiscountedProductsController = async (req, res, next) => {
  try {
    const products = await getTop3DiscountedProducts();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   SEND NEWSLETTER TO ALL SUBSCRIBERS (ADMIN)
--------------------------------------------------- */
export const sendNewsletterController = async (req, res, next) => {
  try {
    const result = await sendNewsletterToSubscribers();

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   GET ALL SUBSCRIBERS (ADMIN)
--------------------------------------------------- */
export const getAllSubscribersController = async (req, res, next) => {
  try {
    const result = await getAllSubscribers(req.query);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   DELETE SUBSCRIBER (ADMIN)
--------------------------------------------------- */
export const deleteSubscriberController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await deleteSubscriber(id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
