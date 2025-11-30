# Product Tags API Documentation

This document provides comprehensive documentation for the Product Tags system, allowing you to categorize and filter products using predefined tags.

## Table of Contents

1. [Overview](#overview)
2. [Available Tags](#available-tags)
3. [Public Endpoints](#public-endpoints)
4. [Admin Endpoints](#admin-endpoints)
5. [Usage Examples](#usage-examples)

---

## Overview

The Product Tags system allows you to:
- Assign multiple tags to products (e.g., `best_seller`, `hot`, `new_arrival`)
- Filter products by one or more tags
- Get tag statistics (how many products have each tag)
- Bulk update tags for multiple products (admin only)

**Key Features**:
- 12 predefined tags with English and Arabic names
- Tag-based filtering with pagination
- Combines with existing filters (category, brand, search)
- Fast indexed queries
- Bilingual tag names

---

## Available Tags

The system supports the following predefined tags:

| Tag | English | Arabic | Use Case |
|-----|---------|--------|----------|
| `best_seller` | Best Seller | الأكثر مبيعاً | Top-selling products |
| `hot` | Hot | ساخن | Trending/hot items |
| `new_arrival` | New Arrival | وصل حديثاً | Recently added products |
| `trending` | Trending | رائج | Currently popular items |
| `featured` | Featured | مميز | Featured/highlighted products |
| `limited_edition` | Limited Edition | إصدار محدود | Limited availability |
| `on_sale` | On Sale | تخفيضات | Products with discounts |
| `clearance` | Clearance | تصفية | Clearance items |
| `top_rated` | Top Rated | الأعلى تقييماً | Highest rated products |
| `eco_friendly` | Eco Friendly | صديق للبيئة | Environmentally friendly |
| `exclusive` | Exclusive | حصري | Exclusive products |
| `recommended` | Recommended | موصى به | Recommended items |

---

## Public Endpoints

These endpoints are accessible without authentication.

### 1. Get All Available Tags

Get a list of all available tags with product counts.

**GET** `/api/v1/products/tags/available`

**Response**:
```json
{
  "OK": true,
  "message": "Available tags fetched successfully",
  "data": [
    {
      "tag": "best_seller",
      "count": 45,
      "displayName": {
        "en": "Best Seller",
        "ar": "الأكثر مبيعاً"
      }
    },
    {
      "tag": "hot",
      "count": 23,
      "displayName": {
        "en": "Hot",
        "ar": "ساخن"
      }
    },
    {
      "tag": "new_arrival",
      "count": 12,
      "displayName": {
        "en": "New Arrival",
        "ar": "وصل حديثاً"
      }
    }
    // ... more tags
  ]
}
```

**Use Cases**:
- Display tag filters in UI
- Show product counts per tag
- Build tag navigation menu

---

### 2. Get Products by Single Tag

Get all products that have a specific tag.

**GET** `/api/v1/products/tag/:tag`

**Path Parameters**:
- `tag` (required): One of the available tag values

**Query Parameters** (all optional):
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: Sort field (e.g., `-createdAt`, `price`)
- `category`: Filter by category ID
- `brand`: Filter by brand ID
- `status`: Filter by status
- `search`: Search in product names

**Example Request**:
```
GET /api/v1/products/tag/best_seller?page=1&limit=20&sort=-salesCount
```

**Response**:
```json
{
  "OK": true,
  "message": "Products with tag 'best_seller' fetched successfully",
  "data": [
    {
      "id": "60d5ec49f1b2c72b8c8e4a1f",
      "en": {
        "name": "Samsung Refrigerator",
        "title": "Premium Refrigerator",
        "slug": "samsung-refrigerator",
        "images": [...]
      },
      "ar": {
        "name": "ثلاجة سامسونج",
        "title": "ثلاجة فاخرة",
        "slug": "ثلاجة-سامسونج",
        "images": [...]
      },
      "sku": "SAMS-FRIDGE-001",
      "price": 2499,
      "discountPrice": 1999,
      "finalPrice": 1999,
      "discountPercentage": 20,
      "tags": ["best_seller", "featured", "top_rated"],
      "category": {...},
      "brand": {...}
    }
    // ... more products
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

**Valid Tags**:
- `best_seller`, `hot`, `new_arrival`, `trending`, `featured`, `limited_edition`
- `on_sale`, `clearance`, `top_rated`, `eco_friendly`, `exclusive`, `recommended`

**Error Response** (Invalid Tag):
```json
{
  "statusCode": 400,
  "message": "Invalid tag. Valid tags: best_seller, hot, new_arrival, ..."
}
```

---

### 3. Get Products by Multiple Tags

Get products that have ALL specified tags.

**GET** `/api/v1/products/tags`

**Query Parameters**:
- `tags` (required): Comma-separated list of tags
- `page`, `limit`, `sort`, `category`, `brand`, `status`, `search` (optional)

**Example Request**:
```
GET /api/v1/products/tags?tags=best_seller,featured&page=1&limit=10
```

This returns products that have BOTH `best_seller` AND `featured` tags.

**Response**:
```json
{
  "OK": true,
  "message": "Products with tags fetched successfully",
  "data": [
    {
      "id": "60d5ec49f1b2c72b8c8e4a1f",
      "tags": ["best_seller", "featured", "top_rated"],
      // ... product details
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

**Error Response** (Invalid Tags):
```json
{
  "statusCode": 400,
  "message": "Invalid tags: invalid_tag. Valid tags: best_seller, hot, ..."
}
```

**Error Response** (Missing Tags):
```json
{
  "OK": false,
  "message": "Tags query parameter is required"
}
```

---

## Admin Endpoints

These endpoints require authentication and proper permissions.

### 4. Bulk Update Product Tags

Add or remove tags from multiple products at once.

**POST** `/api/v1/products/tags/bulk-update`

**Authentication**: Required
**Permission**: `products:update`
**Content-Type**: `multipart/form-data`

**Request Body** (FormData):
```javascript
const formData = new FormData();

// Product IDs to update
formData.append("productIds[0]", "60d5ec49f1b2c72b8c8e4a1c");
formData.append("productIds[1]", "60d5ec49f1b2c72b8c8e4a1d");
formData.append("productIds[2]", "60d5ec49f1b2c72b8c8e4a1e");

// Tags to add (optional)
formData.append("tagsToAdd[0]", "best_seller");
formData.append("tagsToAdd[1]", "featured");

// Tags to remove (optional)
formData.append("tagsToRemove[0]", "clearance");
```

**Response**:
```json
{
  "OK": true,
  "message": "Product tags updated successfully",
  "data": {
    "modifiedCount": 3,
    "matchedCount": 3
  }
}
```

**Notes**:
- You can provide `tagsToAdd`, `tagsToRemove`, or both
- Tags are added using `$addToSet` (no duplicates)
- Tags are removed using `$pull`
- Invalid tags will return an error

**Error Response** (Missing productIds):
```json
{
  "OK": false,
  "message": "productIds array is required"
}
```

**Error Response** (Invalid Tags):
```json
{
  "statusCode": 400,
  "message": "Invalid tags to add: invalid_tag"
}
```

---

## Usage Examples

### Example 1: Display Best Sellers on Homepage

```javascript
// Get top 10 best sellers
fetch('/api/v1/products/tag/best_seller?limit=10&sort=-salesCount')
  .then(res => res.json())
  .then(data => {
    console.log('Best Sellers:', data.data);
  });
```

### Example 2: Show New Arrivals with Filters

```javascript
// Get new arrivals from specific category
fetch('/api/v1/products/tag/new_arrival?category=60d5ec49f1b2c72b8c8e4a20&limit=20')
  .then(res => res.json())
  .then(data => {
    console.log('New Arrivals:', data.data);
  });
```

### Example 3: Featured Best Sellers

```javascript
// Get products that are both featured and best sellers
fetch('/api/v1/products/tags?tags=best_seller,featured&limit=5')
  .then(res => res.json())
  .then(data => {
    console.log('Featured Best Sellers:', data.data);
  });
```

### Example 4: Build Tag Filter UI

```javascript
// Get all tags with counts
fetch('/api/v1/products/tags/available')
  .then(res => res.json())
  .then(data => {
    const tags = data.data;

    // Display in UI
    tags.forEach(tag => {
      console.log(`${tag.displayName.en}: ${tag.count} products`);
    });
  });
```

### Example 5: Admin Bulk Tag Update

```javascript
const formData = new FormData();

// Select products
formData.append("productIds[0]", "60d5ec49f1b2c72b8c8e4a1c");
formData.append("productIds[1]", "60d5ec49f1b2c72b8c8e4a1d");

// Add "on_sale" tag
formData.append("tagsToAdd[0]", "on_sale");

// Remove "clearance" tag
formData.append("tagsToRemove[0]", "clearance");

fetch('/api/v1/products/tags/bulk-update', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log('Updated:', data.data.modifiedCount, 'products');
  });
```

### Example 6: Sale Items from Specific Brand

```javascript
// Get all sale items from Samsung
fetch('/api/v1/products/tag/on_sale?brand=60d5ec49f1b2c72b8c8e4a21')
  .then(res => res.json())
  .then(data => {
    console.log('Samsung Sale Items:', data.data);
  });
```

### Example 7: Search within Tagged Products

```javascript
// Search for "refrigerator" in best sellers
fetch('/api/v1/products/tag/best_seller?search=refrigerator')
  .then(res => res.json())
  .then(data => {
    console.log('Best Selling Refrigerators:', data.data);
  });
```

---

## Integration with Product Creation/Update

When creating or updating products, include tags in the FormData:

**Creating a Product with Tags**:
```javascript
const formData = new FormData();

// Basic product data
formData.append("en.name", "Premium Refrigerator");
formData.append("ar.name", "ثلاجة فاخرة");
formData.append("sku", "PREM-FRIDGE-001");
formData.append("price", "2999");

// Add tags
formData.append("tags[0]", "new_arrival");
formData.append("tags[1]", "featured");
formData.append("tags[2]", "exclusive");

// ... other fields
```

**Updating Product Tags**:
```javascript
const formData = new FormData();

// Update only tags
formData.append("tags[0]", "best_seller");
formData.append("tags[1]", "top_rated");

fetch('/api/v1/products/:productId', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

---

## Best Practices

1. **Use Appropriate Tags**: Choose tags that accurately describe the product
2. **Combine Tags**: Products can have multiple tags (e.g., `best_seller` + `featured`)
3. **Update Regularly**: Keep tags current (remove `new_arrival` after 30 days, etc.)
4. **Cache Tag Data**: Cache the available tags response for better performance
5. **Validate Client-Side**: Use the available tags list to validate before submission
6. **Monitor Tag Usage**: Check tag counts to see which tags are most used

---

## Tag Management Workflow

### For Admins:

1. **Mark New Products**:
   - When adding new products, add `new_arrival` tag
   - After 30 days, remove `new_arrival` via bulk update

2. **Highlight Best Sellers**:
   - Query products with highest `salesCount`
   - Bulk add `best_seller` tag to top performers

3. **Promote Sales**:
   - When running sales, bulk add `on_sale` tag
   - After sale ends, bulk remove `on_sale` tag

4. **Featured Products**:
   - Manually select products to feature
   - Add `featured` tag for homepage display

---

## Tag Automation System

The tag automation system intelligently assigns and removes tags based on product metrics, sales data, and other criteria.

### Automation Rules

The system includes predefined rules for automatic tag assignment:

| Tag | Rule Type | Criteria |
|-----|-----------|----------|
| `best_seller` | Sales Performance | Top 20% by sales count (min 10 sales) |
| `hot` | Trending | Views >= 100 in last 7 days |
| `new_arrival` | Age-based | Created within last 30 days |
| `trending` | Growth | High sales (>5) + high views (>50) |
| `on_sale` | Discount-based | Discount >= 10% |
| `clearance` | Discount-based | Discount >= 30% |
| `top_rated` | Rating-based | Rating >= 4.5 with min 5 reviews |
| `limited_edition` | Stock-based | Stock between 1-10 units |

### 5. Run Tag Automation

Automatically assign/remove tags based on product metrics.

**POST** `/api/v1/products/tags/auto-assign`

**Authentication**: Required
**Permission**: `products:update`
**Content-Type**: `multipart/form-data`

**Request Body** (FormData):
```javascript
const formData = new FormData();

// Run in dry-run mode (preview changes without applying)
formData.append("dryRun", "true"); // or false

// Optional: Only apply specific tags
formData.append("tags[0]", "best_seller");
formData.append("tags[1]", "new_arrival");

// Optional: Only process specific products
formData.append("productIds[0]", "60d5ec49f1b2c72b8c8e4a1c");
formData.append("productIds[1]", "60d5ec49f1b2c72b8c8e4a1d");
```

**Response**:
```json
{
  "OK": true,
  "message": "Tag automation completed successfully",
  "data": {
    "processed": 150,
    "updated": 45,
    "tagsAdded": {
      "best_seller": 12,
      "new_arrival": 8,
      "on_sale": 15,
      "hot": 10
    },
    "tagsRemoved": {
      "new_arrival": 5,
      "clearance": 3
    },
    "errors": [],
    "dryRun": false
  }
}
```

**Dry Run Response**:
```json
{
  "OK": true,
  "message": "Dry run completed - no changes made",
  "data": {
    "processed": 150,
    "updated": 0,
    "tagsAdded": {
      "best_seller": 12,
      "new_arrival": 8
    },
    "tagsRemoved": {
      "new_arrival": 5
    },
    "dryRun": true
  }
}
```

---

### 6. Cleanup Expired Tags

Remove tags that no longer apply (e.g., `new_arrival` after 30 days).

**POST** `/api/v1/products/tags/cleanup`

**Authentication**: Required
**Permission**: `products:update`
**Content-Type**: `multipart/form-data`

**Response**:
```json
{
  "OK": true,
  "message": "Tag cleanup completed successfully",
  "data": {
    "processed": 25,
    "updated": 25,
    "tagsRemoved": {
      "new_arrival": 20,
      "on_sale": 5
    }
  }
}
```

---

### 7. Get Tag Automation Rules

Get the current automation rules configuration.

**GET** `/api/v1/products/tags/rules`

**Authentication**: Required
**Permission**: `products:read`

**Response**:
```json
{
  "OK": true,
  "message": "Tag automation rules fetched successfully",
  "data": {
    "best_seller": {
      "enabled": true,
      "rule": "salesCount",
      "threshold": "top20percent",
      "minSales": 10
    },
    "new_arrival": {
      "enabled": true,
      "rule": "age",
      "daysThreshold": 30
    },
    "on_sale": {
      "enabled": true,
      "rule": "discount",
      "minDiscountPercentage": 10
    }
    // ... all other rules
  }
}
```

---

### 8. Update Tag Automation Rule

Update configuration for a specific tag rule.

**PUT** `/api/v1/products/tags/rules/:tag`

**Authentication**: Required
**Permission**: `products:update`
**Content-Type**: `multipart/form-data`

**Path Parameters**:
- `tag`: The tag to update (e.g., `best_seller`)

**Request Body** (FormData):
```javascript
const formData = new FormData();

// Enable/disable the rule
formData.append("enabled", "true");

// Update thresholds
formData.append("minSales", "15"); // for best_seller
formData.append("daysThreshold", "45"); // for new_arrival
formData.append("minDiscountPercentage", "15"); // for on_sale
```

**Response**:
```json
{
  "OK": true,
  "message": "Tag automation rule updated successfully",
  "data": {
    "enabled": true,
    "rule": "salesCount",
    "threshold": "top20percent",
    "minSales": 15
  }
}
```

---

### 9. Preview Tag Assignment

Preview what tags would be assigned to a specific product.

**GET** `/api/v1/products/:productId/tags/preview`

**Authentication**: Required
**Permission**: `products:read`

**Path Parameters**:
- `productId`: The product ID

**Response**:
```json
{
  "OK": true,
  "message": "Tag preview generated successfully",
  "data": {
    "productId": "60d5ec49f1b2c72b8c8e4a1f",
    "productName": "Samsung Refrigerator",
    "currentTags": ["new_arrival", "featured"],
    "suggestedTags": ["best_seller", "top_rated"],
    "tagsToRemove": [],
    "reasoning": {
      "best_seller": {
        "shouldHaveTag": true,
        "hasTag": false,
        "rule": "salesCount",
        "reason": "In top 20% with 45 sales"
      },
      "top_rated": {
        "shouldHaveTag": true,
        "hasTag": false,
        "rule": "rating",
        "reason": "Rating: 4.7 (23 reviews)"
      },
      "new_arrival": {
        "shouldHaveTag": true,
        "hasTag": true,
        "rule": "age",
        "reason": "Created 15 days ago"
      },
      "hot": {
        "shouldHaveTag": false,
        "hasTag": false,
        "rule": "trending",
        "reason": "Does not meet criteria"
      }
    }
  }
}
```

---

## Automation Examples

### Example 8: Run Tag Automation (Dry Run)

```javascript
// Preview what changes would be made
const formData = new FormData();
formData.append("dryRun", "true");

fetch('/api/v1/products/tags/auto-assign', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log('Would update:', data.data.updated, 'products');
    console.log('Tags to add:', data.data.tagsAdded);
    console.log('Tags to remove:', data.data.tagsRemoved);
  });
```

### Example 9: Run Tag Automation (Apply Changes)

```javascript
// Actually apply the tag changes
const formData = new FormData();
formData.append("dryRun", "false");

fetch('/api/v1/products/tags/auto-assign', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log('Updated:', data.data.updated, 'products');
  });
```

### Example 10: Run Automation for Specific Tags Only

```javascript
// Only update best_seller and new_arrival tags
const formData = new FormData();
formData.append("dryRun", "false");
formData.append("tags[0]", "best_seller");
formData.append("tags[1]", "new_arrival");

fetch('/api/v1/products/tags/auto-assign', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log('Updated:', data.data.updated, 'products');
  });
```

### Example 11: Preview Tags for a Product

```javascript
// See what tags would be assigned to a product
fetch('/api/v1/products/60d5ec49f1b2c72b8c8e4a1f/tags/preview', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
  .then(res => res.json())
  .then(data => {
    console.log('Current tags:', data.data.currentTags);
    console.log('Suggested tags:', data.data.suggestedTags);
    console.log('Tags to remove:', data.data.tagsToRemove);
    console.log('Reasoning:', data.data.reasoning);
  });
```

### Example 12: Cleanup Expired Tags

```javascript
// Remove tags that no longer apply
fetch('/api/v1/products/tags/cleanup', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: new FormData()
})
  .then(res => res.json())
  .then(data => {
    console.log('Cleaned up:', data.data.updated, 'products');
    console.log('Tags removed:', data.data.tagsRemoved);
  });
```

### Example 13: Update Automation Rule

```javascript
// Change the minimum sales for best_seller tag
const formData = new FormData();
formData.append("enabled", "true");
formData.append("minSales", "20");

fetch('/api/v1/products/tags/rules/best_seller', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log('Rule updated:', data.data);
  });
```

### Example 14: Disable a Tag Rule

```javascript
// Disable the hot tag automation
const formData = new FormData();
formData.append("enabled", "false");

fetch('/api/v1/products/tags/rules/hot', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log('Rule disabled');
  });
```

---

## Automation Workflow

### Recommended Automation Schedule

1. **Daily** (at 2 AM):
   - Run tag cleanup to remove expired tags
   ```bash
   POST /api/v1/products/tags/cleanup
   ```

2. **Daily** (at 3 AM):
   - Run full tag automation
   ```bash
   POST /api/v1/products/tags/auto-assign
   ```

3. **Weekly**:
   - Review tag assignment statistics
   - Adjust rule thresholds if needed

### Setting Up Automated Jobs

You can use a cron job or task scheduler to run tag automation automatically:

**Node-cron Example**:
```javascript
import cron from 'node-cron';
import axios from 'axios';

// Run cleanup daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  await axios.post('http://localhost:3000/api/v1/products/tags/cleanup', {}, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
});

// Run tag automation daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  await axios.post('http://localhost:3000/api/v1/products/tags/auto-assign', {
    dryRun: false
  }, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
});
```

---

## Response Codes

- `200 OK`: Successful request
- `400 Bad Request`: Invalid tag or missing required parameters
- `401 Unauthorized`: Authentication required (bulk update only)
- `403 Forbidden`: Insufficient permissions (bulk update only)
- `500 Internal Server Error`: Server error

---

## Support

For issues or questions, please refer to the project repository or contact the development team.
