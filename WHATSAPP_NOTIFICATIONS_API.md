# WhatsApp Notifications & Notification System API

Complete documentation for the WhatsApp notification system and in-app notifications.

---

## Table of Contents

1. [Overview](#overview)
2. [WhatsApp Configuration](#whatsapp-configuration)
3. [Automatic Triggers](#automatic-triggers)
4. [User Notification Endpoints](#user-notification-endpoints)
5. [Admin Notification Endpoints](#admin-notification-endpoints)
6. [WhatsApp Webhook](#whatsapp-webhook)
7. [Notification Types](#notification-types)
8. [Examples](#examples)

---

## Overview

The notification system provides:
- **WhatsApp Business API integration** for real-time customer notifications
- **In-app notifications** for user dashboard
- **Automatic triggers** for user registration, order updates, and promotions
- **Admin notification management** for broadcasting discounts and flash sales
- **Webhook support** for WhatsApp status updates

---

## WhatsApp Configuration

### Environment Variables

Add these to your `.env` file:

```env
# WhatsApp Business API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=elba_whatsapp_webhook
```

### Getting WhatsApp Business API Credentials

1. Create a Facebook Business Account
2. Set up WhatsApp Business API
3. Get your Phone Number ID and Access Token from Facebook Developer Console
4. Configure webhook URL: `https://yourdomain.com/api/v1/notifications/whatsapp/webhook`

---

## Automatic Triggers

The system automatically sends WhatsApp notifications for these events:

### 1. New User Registration

**Triggered when**: User successfully registers
**Message** (Arabic):
```
مرحباً {name}! 🎉

شكراً لتسجيلك في متجرنا للأجهزة المنزلية.

يمكنك الآن تصفح أحدث العروض والمنتجات.

فريق خدمة العملاء
```

### 2. Order Status Updates

**Triggered when**: Order status changes to: `confirmed`, `shipped`, `delivered`, or `cancelled`

**Order Confirmed**:
```
تم تأكيد طلبك #{orderNumber} ✅

سيتم معالجة طلبك وشحنه قريباً.

الإجمالي: {totalPrice} ريال
```

**Order Shipped**:
```
تم شحن طلبك #{orderNumber} 🚚

رقم الشحنة: {trackingNumber}

التوصيل المتوقع: {estimatedDelivery}
```

**Order Delivered**:
```
تم توصيل طلبك #{orderNumber} ✨

نتمنى أن تنال المنتجات إعجابك!

يمكنك تقييم المنتجات من حسابك.
```

**Order Cancelled**:
```
تم إلغاء طلبك #{orderNumber} ❌

إذا كان لديك أي استفسار، يرجى التواصل معنا.

سيتم استرداد المبلغ خلال 3-5 أيام عمل.
```

---

## User Notification Endpoints

### 1. Get User Notifications

**GET** `/api/v1/notifications`

**Authentication**: Required

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `type` (string, optional) - Filter by notification type
- `read` (boolean, optional) - Filter by read status
- `priority` (string, optional) - Filter by priority

**Response**:
```json
{
  "OK": true,
  "message": "Notifications fetched successfully",
  "fromCache": false,
  "notifications": [
    {
      "id": "60d5ec49f1b2c72b8c8e4a1f",
      "type": "order_confirmed",
      "title": {
        "en": "Order Confirmed",
        "ar": "تم تأكيد الطلب"
      },
      "message": {
        "en": "Your order #12345 has been confirmed",
        "ar": "تم تأكيد طلبك #12345"
      },
      "whatsapp": {
        "sent": true,
        "sentAt": "2025-12-01T10:00:00Z",
        "status": "delivered"
      },
      "inApp": {
        "read": false,
        "readAt": null
      },
      "priority": "high",
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "unreadCount": 12
}
```

---

### 2. Get Unread Count

**GET** `/api/v1/notifications/unread-count`

**Authentication**: Required

**Response**:
```json
{
  "OK": true,
  "message": "Unread count fetched successfully",
  "fromCache": true,
  "count": 12
}
```

---

### 3. Mark Notification as Read

**PATCH** `/api/v1/notifications/:notificationId/read`

**Authentication**: Required

**Response**:
```json
{
  "OK": true,
  "message": "Notification marked as read",
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1f",
    "inApp": {
      "read": true,
      "readAt": "2025-12-01T11:00:00Z"
    }
  }
}
```

---

### 4. Mark All as Read

**PATCH** `/api/v1/notifications/mark-all-read`

**Authentication**: Required

**Response**:
```json
{
  "OK": true,
  "message": "All notifications marked as read"
}
```

---

### 5. Delete Notification

**DELETE** `/api/v1/notifications/:notificationId`

**Authentication**: Required

**Response**:
```json
{
  "OK": true,
  "message": "Notification deleted successfully"
}
```

---

### 6. Delete All Notifications

**DELETE** `/api/v1/notifications`

**Authentication**: Required

**Response**:
```json
{
  "OK": true,
  "message": "All notifications deleted successfully"
}
```

---

## Admin Notification Endpoints

### 1. Send Discount Notification

**POST** `/api/v1/notifications/send-discount`

**Authentication**: Required
**Permission**: `analytics:create`
**Content-Type**: `multipart/form-data`

**Request Body** (FormData):
```javascript
const formData = new FormData();

// Option 1: Send to specific users
formData.append("userIds[0]", "60d5ec49f1b2c72b8c8e4a1c");
formData.append("userIds[1]", "60d5ec49f1b2c72b8c8e4a1d");
formData.append("couponId", "60d5ec49f1b2c72b8c8e4a1e");

// Option 2: Broadcast to all active users
formData.append("broadcast", "true");
formData.append("couponId", "60d5ec49f1b2c72b8c8e4a1e");
```

**Response**:
```json
{
  "OK": true,
  "message": "Discount notifications sent",
  "data": {
    "totalUsers": 150,
    "totalSent": 145,
    "totalFailed": 5
  }
}
```

---

### 2. Send Flash Sale Notification

**POST** `/api/v1/notifications/send-flash-sale`

**Authentication**: Required
**Permission**: `analytics:create`
**Content-Type**: `multipart/form-data`

**Request Body** (FormData):
```javascript
const formData = new FormData();

formData.append("broadcast", "true");
formData.append("saleInfo.title.ar", "عرض فلاش - خصم 50%");
formData.append("saleInfo.title.en", "Flash Sale - 50% OFF");
formData.append("saleInfo.maxDiscount", "50");
formData.append("saleInfo.duration", "24 ساعة");
formData.append("saleInfo.endDate", "2025-12-02T23:59:59Z");
```

**Response**:
```json
{
  "OK": true,
  "message": "Flash sale notifications sent",
  "data": {
    "totalUsers": 200,
    "totalSent": 195,
    "totalFailed": 5
  }
}
```

---

### 3. Get Notification Statistics

**GET** `/api/v1/notifications/stats`

**Authentication**: Required
**Permission**: `analytics:read`

**Response**:
```json
{
  "OK": true,
  "message": "Notification statistics fetched successfully",
  "fromCache": false,
  "data": {
    "byType": [
      { "_id": "order_confirmed", "count": 450 },
      { "_id": "order_shipped", "count": 380 },
      { "_id": "new_register", "count": 120 },
      { "_id": "discount_alert", "count": 95 }
    ],
    "byStatus": [
      { "_id": "delivered", "count": 850 },
      { "_id": "sent", "count": 120 },
      { "_id": "failed", "count": 35 }
    ],
    "byPriority": [
      { "_id": "high", "count": 520 },
      { "_id": "medium", "count": 385 },
      { "_id": "low", "count": 100 }
    ],
    "readStats": {
      "totalRead": 680,
      "totalUnread": 325
    },
    "whatsappStats": {
      "totalSent": 850,
      "totalFailed": 35,
      "totalDelivered": 785
    }
  }
}
```

---

## WhatsApp Webhook

### Setup Webhook

**GET/POST** `/api/v1/notifications/whatsapp/webhook`

This endpoint handles WhatsApp webhook verification and status updates.

**Webhook Verification (GET)**:
- Facebook sends verification request with `hub.mode`, `hub.verify_token`, and `hub.challenge`
- Endpoint validates the verify token and responds with challenge

**Status Updates (POST)**:
- Receives delivery status updates: `sent`, `delivered`, `read`, `failed`
- Automatically updates notification status in database

**Configure in Facebook Developer Console**:
- Callback URL: `https://yourdomain.com/api/v1/notifications/whatsapp/webhook`
- Verify Token: `elba_whatsapp_webhook` (or your custom token)
- Subscribe to: `messages` events

---

## Notification Types

| Type | Description | Triggered By |
|------|-------------|--------------|
| `new_register` | Welcome message for new users | User registration |
| `order_created` | Order creation confirmation | Order placement |
| `order_confirmed` | Order confirmed by admin | Order status update |
| `order_shipped` | Order shipped notification | Order status update |
| `order_delivered` | Order delivered confirmation | Order status update |
| `order_cancelled` | Order cancellation notice | Order cancellation |
| `discount_alert` | Discount/coupon promotion | Admin broadcast |
| `flash_sale` | Flash sale announcement | Admin broadcast |
| `new_product` | New product launch | Manual trigger |
| `stock_alert` | Product back in stock | Manual trigger |
| `review_reminder` | Reminder to review products | Scheduled job |
| `general` | General notifications | Manual trigger |

---

## Examples

### Example 1: User Registration Flow

```javascript
// Automatic - no manual trigger needed
// When user registers via POST /api/v1/auth/register
// System automatically:
// 1. Creates user account
// 2. Sends WhatsApp welcome message
// 3. Creates in-app notification
```

### Example 2: Order Status Update

```javascript
// Admin updates order status
const formData = new FormData();
formData.append("status", "shipped");
formData.append("note", "Package dispatched via Aramex");

fetch('/api/v1/orders/admin/:orderId/status', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + adminToken
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    // System automatically:
    // 1. Updates order status
    // 2. Sends WhatsApp notification to customer
    // 3. Creates in-app notification
    console.log('Order updated, customer notified');
  });
```

### Example 3: Broadcast Discount to All Users

```javascript
const formData = new FormData();
formData.append("broadcast", "true");
formData.append("couponId", "60d5ec49f1b2c72b8c8e4a1e");

fetch('/api/v1/notifications/send-discount', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken
  },
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log(`Sent to ${data.data.totalSent} users`);
  });
```

### Example 4: Get User's Unread Notifications

```javascript
fetch('/api/v1/notifications?read=false&page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer ' + userToken
  }
})
  .then(res => res.json())
  .then(data => {
    console.log(`${data.unreadCount} unread notifications`);
    data.notifications.forEach(notif => {
      console.log(notif.message.ar);
    });
  });
```

### Example 5: Mark Notification as Read

```javascript
fetch('/api/v1/notifications/60d5ec49f1b2c72b8c8e4a1f/read', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + userToken
  }
})
  .then(res => res.json())
  .then(data => {
    console.log('Notification marked as read');
  });
```

---

## Best Practices

### For Admins

1. **Rate Limiting**: When broadcasting to many users, the system adds a 1-second delay between messages to avoid rate limiting
2. **User Consent**: Only send promotional notifications to users who haven't opted out
3. **Test First**: Test WhatsApp messages with a small group before broadcasting to all users
4. **Monitor Statistics**: Check notification stats regularly to track delivery success rate

### For Developers

1. **Handle Failures Gracefully**: WhatsApp notifications are non-blocking; failures won't stop order processing
2. **Cache Notifications**: User notifications are cached for 5 minutes for better performance
3. **Clear Cache**: Cache is automatically cleared when new notifications are created
4. **Webhook Security**: Verify webhook verify token matches your configuration

---

## Response Codes

- `200 OK`: Successful request
- `201 Created`: Notification created successfully
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Notification not found
- `500 Internal Server Error`: Server error

---

## Support

For WhatsApp Business API setup and troubleshooting, refer to:
- [Facebook Business Documentation](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/api/messages)
