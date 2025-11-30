export const formatProductList  = (p) => {
  return {
    id: p._id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    finalPrice: p.finalPrice,
    image: p.images?.find(img => img.isPrimary)?.url,
    brand: p.brand?.name,
    rating: p.ratingsAverage || 0,
    ratingCount: p.ratingsQuantity || 0,
  };
};

export const formatProductDetails = (p) => ({
  id: p._id,
  name: p.name,
  slug: p.slug,
  sku: p.sku,
  description: p.description,
  images: p.images,
  price: p.price,
  finalPrice: p.finalPrice,
  category: p.category,
  brand: p.brand,
  specifications: p.specifications,
  features: p.features,
  compareAttributes: p.compareAttributes,
  seo: p.seo
});