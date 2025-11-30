// services/seoService.js

class SeoService {
  /**
   * Process and merge SEO data safely
   * @param {Object} incomingSeo - Incoming SEO data from request
   * @param {Object} defaultValues - Default fallback values
   * @returns {Object} - Clean merged SEO object
   */
  static processSeoData(incomingSeo = {}, defaultValues = {}) {
    const safe = (val, def) =>
      val === undefined || val === null || val === "" ? def : val;

    // Build base defaults (if helper exists)
    const baseDefaults = createDefaultSeo
      ? createDefaultSeo(
          defaultValues.metaTitle || "Default Title",
          defaultValues.metaDescription || "Default Description",
          defaultValues.openGraph?.image || ""
        )
      : {};

    const defaults = { ...baseDefaults, ...defaultValues };

    // Start merging safely
    return {
      metaTitle: safe(incomingSeo.metaTitle, defaults.metaTitle || "Default Title"),
      metaDescription: safe(
        incomingSeo.metaDescription,
        defaults.metaDescription || "Default Description"
      ),

      openGraph: {
        title: safe(
          incomingSeo.openGraph?.title,
          defaults.openGraph?.title || defaults.metaTitle
        ),
        description: safe(
          incomingSeo.openGraph?.description,
          defaults.openGraph?.description || defaults.metaDescription
        ),
        image: safe(
          incomingSeo.openGraph?.image,
          defaults.openGraph?.image || ""
        ),
        type: safe(incomingSeo.openGraph?.type, "website"),
      },

      twitter: {
        card: safe(
          incomingSeo.twitter?.card,
          defaults.twitter?.card || "summary_large_image"
        ),
        title: safe(
          incomingSeo.twitter?.title,
          defaults.twitter?.title || defaults.metaTitle
        ),
        description: safe(
          incomingSeo.twitter?.description,
          defaults.twitter?.description || defaults.metaDescription
        ),
        image: safe(
          incomingSeo.twitter?.image,
          defaults.twitter?.image || ""
        ),
      },

      canonicalUrl: safe(
        incomingSeo.canonicalUrl,
        defaults.canonicalUrl ||
          `https://abwabdigital.com/services/default`
      ),
    };
  }
}

module.exports = { processSeoData: SeoService.processSeoData };
