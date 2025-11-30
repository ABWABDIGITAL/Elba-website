# Blog & Static Pages API Documentation

Complete SEO-optimized blog system and static pages management for your home appliances e-commerce platform.

---

## Table of Contents

1. [Blog System Overview](#blog-system-overview)
2. [Static Pages Overview](#static-pages-overview)
3. [Blog Categories](#blog-categories)
4. [Blog Endpoints](#blog-endpoints)
5. [Static Pages Endpoints](#static-pages-endpoints)
6. [SEO Features](#seo-features)
7. [Examples](#examples)

---

## Blog System Overview

The blog system provides:
- **Multi-language support** (Arabic & English)
- **SEO optimization** with meta tags, structured data, canonical URLs
- **Rich content management** with featured images, categories, tags
- **Engagement tracking** (views, likes, shares)
- **Auto-calculated reading time**
- **Related products** integration
- **Redis caching** for performance

---

## Static Pages Overview

Pre-configured static pages for your e-commerce platform:

| Page Type | Arabic Title | English Title |
|-----------|--------------|---------------|
| `privacy_policy` | سياسة الخصوصية | Privacy Policy |
| `terms_conditions` | الشروط والأحكام | Terms and Conditions |
| `about_us` | من نحن | About Us |
| `return_exchange` | الاستبدال والاسترجاع | Return and Exchange Policy |
| `shipping_delivery` | الشحن والتوصيل | Shipping and Delivery |
| `warranty_policy` | سياسة الضمان | Warranty Policy |
| `contact_us` | اتصل بنا | Contact Us |
| `faq` | الأسئلة الشائعة | FAQ |

**Note**: Default pages are automatically seeded on server startup.

---

## Blog Categories

Available blog categories:

| Category | Description (Arabic) | Description (English) |
|----------|---------------------|----------------------|
| `news` | الأخبار | Company and industry news |
| `tips` | نصائح | Tips and tricks for home appliances |
| `guides` | أدلة | How-to guides and tutorials |
| `reviews` | مراجعات | Product reviews and comparisons |
| `maintenance` | الصيانة | Maintenance and care guides |
| `buying_guide` | دليل الشراء | Buying guides and recommendations |
| `energy_saving` | توفير الطاقة | Energy saving tips |
| `seasonal` | موسمي | Seasonal content and offers |
| `company_news` | أخبار الشركة | Company updates and announcements |

---

## Blog Endpoints

### Public Endpoints

#### 1. Get All Blogs

**GET** `/api/v1/blogs`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 12)
- `category` (string, optional)
- `tag` (string, optional)
- `status` (string, default: "published")
- `featured` (boolean, optional)
- `search` (string, optional) - Full-text search
- `language` (string, default: "ar")

**Response**:
```json
{
  "OK": true,
  "message": "Blogs fetched successfully",
  "fromCache": false,
  "blogs": [
    {
      "id": "60d5ec49f1b2c72b8c8e4a1f",
      "title": "أفضل 10 نصائح لصيانة الثلاجة",
      "slug": "best-10-refrigerator-maintenance-tips",
      "excerpt": "تعرف على أهم النصائح للحفاظ على ثلاجتك في أفضل حالة...",
      "featuredImage": "/uploads/blogs/fridge-tips.jpg",
      "imageAlt": "نصائح صيانة الثلاجة",
      "category": "maintenance",
      "tags": ["ثلاجة", "صيانة", "نصائح"],
      "authorName": "فريق الخبراء",
      "publishedAt": "2025-12-01T10:00:00Z",
      "views": 1250,
      "likes": 45,
      "shares": 12,
      "readingTime": 5,
      "isFeatured": true,
      "seo": {
        "metaTitle": "أفضل 10 نصائح لصيانة الثلاجة | دليل شامل",
        "metaDescription": "دليل شامل لصيانة الثلاجة بطرق بسيطة وفعالة...",
        "metaKeywords": ["صيانة الثلاجة", "نصائح", "أجهزة منزلية"],
        "canonicalUrl": "https://yourdomain.com/blogs/best-10-refrigerator-maintenance-tips"
      },
      "createdAt": "2025-12-01T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 48,
    "pages": 4
  }
}
```

---

#### 2. Get Blog by Slug

**GET** `/api/v1/blogs/slug/:slug`

**Query Parameters**:
- `language` (string, default: "ar")

**Example**: `/api/v1/blogs/slug/best-10-refrigerator-maintenance-tips?language=ar`

**Response**:
```json
{
  "OK": true,
  "message": "Blog fetched successfully",
  "fromCache": false,
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1f",
    "title": "أفضل 10 نصائح لصيانة الثلاجة",
    "slug": "best-10-refrigerator-maintenance-tips",
    "content": "<p>الثلاجة من أهم الأجهزة المنزلية...</p>",
    "featuredImage": "/uploads/blogs/fridge-tips.jpg",
    "category": "maintenance",
    "tags": ["ثلاجة", "صيانة", "نصائح"],
    "relatedProducts": [
      {
        "id": "60d5ec49f1b2c72b8c8e4a20",
        "name": "ثلاجة سامسونج 18 قدم",
        "slug": "samsung-refrigerator-18-cubic-feet",
        "images": ["/uploads/products/samsung-fridge.jpg"]
      }
    ],
    "views": 1250,
    "likes": 45,
    "readingTime": 5,
    "seo": {
      "metaTitle": "أفضل 10 نصائح لصيانة الثلاجة | دليل شامل",
      "metaDescription": "دليل شامل لصيانة الثلاجة بطرق بسيطة وفعالة..."
    }
  }
}
```

**Note**: Views are automatically incremented when fetching by slug.

---

#### 3. Get Featured Blogs

**GET** `/api/v1/blogs/featured`

**Query Parameters**:
- `limit` (number, default: 5)
- `language` (string, default: "ar")

**Response**: Array of featured blog posts

---

#### 4. Get Trending Blogs

**GET** `/api/v1/blogs/trending`

**Query Parameters**:
- `limit` (number, default: 5)
- `language` (string, default: "ar")

**Response**: Array of blogs sorted by views (most popular)

---

#### 5. Get Recent Blogs

**GET** `/api/v1/blogs/recent`

**Query Parameters**:
- `limit` (number, default: 10)
- `language` (string, default: "ar")

**Response**: Array of most recent published blogs

---

#### 6. Get Blogs by Category

**GET** `/api/v1/blogs/category/:category`

**Query Parameters**:
- `limit` (number, default: 10)
- `language` (string, default: "ar")

**Example**: `/api/v1/blogs/category/maintenance?limit=5`

---

#### 7. Get Blog Categories

**GET** `/api/v1/blogs/categories`

**Response**:
```json
{
  "OK": true,
  "message": "Blog categories fetched successfully",
  "fromCache": false,
  "data": [
    { "_id": "maintenance", "count": 25 },
    { "_id": "buying_guide", "count": 18 },
    { "_id": "tips", "count": 15 },
    { "_id": "reviews", "count": 12 }
  ]
}
```

---

#### 8. Like Blog Post

**POST** `/api/v1/blogs/:blogId/like`

**Authentication**: Not required (public)

**Response**:
```json
{
  "OK": true,
  "message": "Blog liked successfully",
  "likes": 46
}
```

---

#### 9. Track Share

**POST** `/api/v1/blogs/:blogId/share`

**Authentication**: Not required (public)

**Response**:
```json
{
  "OK": true,
  "message": "Share tracked successfully",
  "shares": 13
}
```

---

### Admin Endpoints

#### 10. Create Blog Post

**POST** `/api/v1/blogs`

**Authentication**: Required
**Permission**: `home:create`
**Content-Type**: `multipart/form-data`

**Request Body** (FormData):
```javascript
const formData = new FormData();

// Titles
formData.append("title.en", "Top 10 Refrigerator Maintenance Tips");
formData.append("title.ar", "أفضل 10 نصائح لصيانة الثلاجة");

// Slugs (optional - auto-generated if not provided)
formData.append("slug.en", "top-10-refrigerator-maintenance-tips");
formData.append("slug.ar", "best-10-refrigerator-maintenance-tips");

// Excerpts
formData.append("excerpt.en", "Learn the best tips to keep your refrigerator running smoothly...");
formData.append("excerpt.ar", "تعرف على أهم النصائح للحفاظ على ثلاجتك في أفضل حالة...");

// Content
formData.append("content.en", "<p>Your refrigerator is one of the most important...</p>");
formData.append("content.ar", "<p>الثلاجة من أهم الأجهزة المنزلية...</p>");

// Featured Image
formData.append("featuredImage", imageFile);
formData.append("imageAlt.en", "Refrigerator maintenance tips");
formData.append("imageAlt.ar", "نصائح صيانة الثلاجة");

// Category & Tags
formData.append("category", "maintenance");
formData.append("tags.en[0]", "refrigerator");
formData.append("tags.en[1]", "maintenance");
formData.append("tags.ar[0]", "ثلاجة");
formData.append("tags.ar[1]", "صيانة");

// Related Products (optional)
formData.append("relatedProducts[0]", "60d5ec49f1b2c72b8c8e4a20");
formData.append("relatedProducts[1]", "60d5ec49f1b2c72b8c8e4a21");

// Author Name (optional)
formData.append("authorName.en", "Expert Team");
formData.append("authorName.ar", "فريق الخبراء");

// SEO (optional - auto-filled from title/excerpt if not provided)
formData.append("seo.metaTitle.en", "Top 10 Refrigerator Maintenance Tips | Complete Guide");
formData.append("seo.metaTitle.ar", "أفضل 10 نصائح لصيانة الثلاجة | دليل شامل");
formData.append("seo.metaDescription.en", "Complete guide to refrigerator maintenance...");
formData.append("seo.metaDescription.ar", "دليل شامل لصيانة الثلاجة...");
formData.append("seo.metaKeywords.en[0]", "refrigerator maintenance");
formData.append("seo.metaKeywords.ar[0]", "صيانة الثلاجة");
formData.append("seo.canonicalUrl", "https://yourdomain.com/blogs/top-10-refrigerator-maintenance-tips");

// Publishing
formData.append("status", "published"); // or "draft"
formData.append("isFeatured", "true");
formData.append("featuredOrder", "1");
formData.append("allowComments", "true");
```

**Response**:
```json
{
  "OK": true,
  "message": "Blog post created successfully",
  "data": { /* full blog object */ }
}
```

---

#### 11. Update Blog Post

**PUT** `/api/v1/blogs/:blogId`

**Authentication**: Required
**Permission**: `home:update`
**Content-Type**: `multipart/form-data`

Same format as create, but all fields are optional.

---

#### 12. Delete Blog Post

**DELETE** `/api/v1/blogs/:blogId`

**Authentication**: Required
**Permission**: `home:delete`

**Response**:
```json
{
  "OK": true,
  "message": "Blog deleted successfully"
}
```

**Note**: This is a soft delete - sets `isActive: false`.

---

## Static Pages Endpoints

### Public Endpoints

#### 1. Get All Pages

**GET** `/api/v1/pages`

**Query Parameters**:
- `language` (string, default: "ar")

**Response**:
```json
{
  "OK": true,
  "message": "Pages fetched successfully",
  "fromCache": true,
  "data": [
    {
      "id": "60d5ec49f1b2c72b8c8e4a22",
      "pageType": "privacy_policy",
      "title": "سياسة الخصوصية",
      "slug": "privacy-policy",
      "content": "<p>خصوصيتك مهمة بالنسبة لنا...</p>",
      "sections": [
        {
          "heading": "المعلومات التي نجمعها",
          "content": "<p>نقوم بجمع المعلومات التي تقدمها لنا مباشرة...</p>",
          "order": 1
        }
      ],
      "seo": {
        "metaTitle": "سياسة الخصوصية | متجر الأجهزة المنزلية",
        "metaDescription": "اطلع على سياسة الخصوصية الخاصة بنا..."
      },
      "lastReviewedDate": "2025-11-01T00:00:00Z",
      "version": 2
    }
  ]
}
```

---

#### 2. Get Page by Type

**GET** `/api/v1/pages/:pageType`

**Query Parameters**:
- `language` (string, default: "ar")

**Example**: `/api/v1/pages/privacy_policy?language=ar`

**Response**:
```json
{
  "OK": true,
  "message": "Page fetched successfully",
  "fromCache": true,
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a22",
    "pageType": "privacy_policy",
    "title": "سياسة الخصوصية",
    "content": "<p>خصوصيتك مهمة بالنسبة لنا...</p>",
    "sections": [
      {
        "heading": "المعلومات التي نجمعها",
        "content": "<p>نقوم بجمع المعلومات...</p>"
      }
    ]
  }
}
```

---

### Admin Endpoints

#### 3. Create Page

**POST** `/api/v1/pages/admin/create`

**Authentication**: Required
**Permission**: `home:create`

#### 4. Update Page

**PUT** `/api/v1/pages/admin/:pageId`

**Authentication**: Required
**Permission**: `home:update`

**Request Body** (FormData):
```javascript
const formData = new FormData();

formData.append("title.ar", "سياسة الخصوصية المحدثة");
formData.append("title.en", "Updated Privacy Policy");
formData.append("content.ar", "<p>محتوى محدث...</p>");
formData.append("content.en", "<p>Updated content...</p>");

// Update sections
formData.append("sections[0].heading.ar", "المعلومات التي نجمعها");
formData.append("sections[0].content.ar", "<p>محتوى القسم...</p>");
formData.append("sections[0].order", "1");
```

---

## SEO Features

### Automatic SEO Optimization

The system automatically:

1. **Generates slugs** from titles if not provided
2. **Calculates reading time** (approx. 200 words/minute)
3. **Auto-fills meta titles** from post title (max 60 chars)
4. **Auto-fills meta descriptions** from excerpt (max 160 chars)
5. **Creates structured data** for rich snippets (optional)
6. **Sets canonical URLs** to avoid duplicate content
7. **Manages versions** for static pages

### SEO Best Practices

**For Blog Posts**:
- Use descriptive, keyword-rich titles
- Keep meta titles under 60 characters
- Keep meta descriptions between 150-160 characters
- Use relevant tags and categories
- Add alt text to featured images
- Link to related products for internal linking

**For Static Pages**:
- Review and update content regularly
- Use structured sections with clear headings
- Set `noindex: true` for pages you don't want in search results
- Keep privacy policy and terms up to date (check `lastReviewedDate`)

---

## Examples

### Example 1: Fetch Homepage Blog Posts

```javascript
// Get featured blogs for homepage
fetch('/api/v1/blogs/featured?limit=3&language=ar')
  .then(res => res.json())
  .then(data => {
    data.data.forEach(blog => {
      console.log(blog.title, blog.excerpt);
    });
  });
```

### Example 2: Create New Blog Post

```javascript
const formData = new FormData();

formData.append("title.ar", "كيفية اختيار الغسالة المناسبة");
formData.append("title.en", "How to Choose the Right Washing Machine");
formData.append("excerpt.ar", "دليل شامل لاختيار الغسالة الأنسب لاحتياجاتك");
formData.append("content.ar", "<p>عند شراء غسالة جديدة...</p>");
formData.append("category", "buying_guide");
formData.append("status", "published");
formData.append("isFeatured", "true");

fetch('/api/v1/blogs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log('Blog created:', data.data.slug.ar);
  });
```

### Example 3: Get Privacy Policy

```javascript
fetch('/api/v1/pages/privacy_policy?language=ar')
  .then(res => res.json())
  .then(data => {
    document.getElementById('privacy-content').innerHTML = data.data.content;
  });
```

### Example 4: Search Blogs

```javascript
fetch('/api/v1/blogs?search=ثلاجة&category=maintenance&language=ar')
  .then(res => res.json())
  .then(data => {
    console.log(`Found ${data.pagination.total} blogs about refrigerator maintenance`);
  });
```

---

## Response Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Support

For content management and SEO optimization support, contact the development team.
