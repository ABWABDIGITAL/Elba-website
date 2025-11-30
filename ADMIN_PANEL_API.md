# Admin Panel API Documentation

This document provides comprehensive documentation for the Admin Panel API with customizable role-based permissions.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Role Management](#role-management)
4. [User Management](#user-management)
5. [Analytics & Dashboard](#analytics--dashboard)
6. [Permissions System](#permissions-system)

---

## Overview

The Admin Panel provides a comprehensive role-based access control (RBAC) system with customizable permissions. The system supports:

- **Customizable Roles**: Create and manage roles with fine-grained permissions
- **Resource-Level Permissions**: Control access to different resources (users, products, orders, etc.)
- **Action-Level Permissions**: Control CRUD operations (create, read, update, delete, export, import)
- **Pre-configured Roles**: 7 default roles including Super Admin, Admin, Manager, Content Manager, Sales Manager, Customer Support, and Viewer
- **Redis Caching**: All frequently accessed data is cached for optimal performance

---

## Authentication

All admin panel endpoints require authentication using Bearer tokens.

### Headers Required

```
Authorization: Bearer <your_jwt_token>
```

### User Roles

The system supports both **legacy roles** and **customizable roles**:

**Legacy Roles** (for backward compatibility):
- `user`
- `admin`
- `manager`
- `superAdmin`

**Customizable Roles**: Assigned via the Role Management system with granular permissions.

---

## Role Management

Base URL: `/api/v1/roles`

### 1. Create a New Role

**POST** `/api/v1/roles`

**Permission Required**: `roles:create`

**Request Body**:
```json
{
  "name": "inventory_manager",
  "displayName": {
    "en": "Inventory Manager",
    "ar": "مدير المخزون"
  },
  "description": {
    "en": "Manages product inventory and stock",
    "ar": "يدير مخزون المنتجات والمخزون"
  },
  "permissions": [
    {
      "resource": "products",
      "actions": {
        "create": true,
        "read": true,
        "update": true,
        "delete": false,
        "export": true,
        "import": true
      }
    },
    {
      "resource": "categories",
      "actions": {
        "create": false,
        "read": true,
        "update": false,
        "delete": false,
        "export": false,
        "import": false
      }
    }
  ],
  "priority": 65,
  "isActive": true
}
```

**Available Resources**:
- `users`
- `products`
- `categories`
- `brands`
- `orders`
- `reviews`
- `coupons`
- `catalogs`
- `home`
- `branches`
- `cart`
- `analytics`
- `roles`
- `settings`

**Available Actions**:
- `create`
- `read`
- `update`
- `delete`
- `export`
- `import`

**Response**:
```json
{
  "status": "success",
  "message": "Role created successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4a1b",
    "name": "inventory_manager",
    "displayName": {
      "en": "Inventory Manager",
      "ar": "مدير المخزون"
    },
    "permissions": [...],
    "isSystemRole": false,
    "isActive": true,
    "priority": 65,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 2. Get All Roles

**GET** `/api/v1/roles`

**Query Parameters**:
- `isActive` (optional): Filter by active status (true/false)

**Response**:
```json
{
  "status": "success",
  "fromCache": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4a1b",
      "name": "super_admin",
      "displayName": {
        "en": "Super Admin",
        "ar": "مدير رئيسي"
      },
      "priority": 100,
      "isSystemRole": true,
      "isActive": true
    }
  ]
}
```

### 3. Get Role by ID

**GET** `/api/v1/roles/:id`

**Response**:
```json
{
  "status": "success",
  "fromCache": false,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4a1b",
    "name": "admin",
    "displayName": {
      "en": "Administrator",
      "ar": "مدير"
    },
    "permissions": [...],
    "isSystemRole": true,
    "priority": 90
  }
}
```

### 4. Update Role

**PUT** `/api/v1/roles/:id`

**Permission Required**: `roles:update`

**Request Body** (all fields optional):
```json
{
  "displayName": {
    "en": "Updated Role Name"
  },
  "permissions": [...],
  "priority": 70,
  "isActive": true
}
```

**Note**: System roles cannot have their `isSystemRole` status changed.

### 5. Delete Role

**DELETE** `/api/v1/roles/:id`

**Permission Required**: `roles:delete`

**Response**:
```json
{
  "status": "success",
  "message": "Role deleted successfully"
}
```

**Note**:
- Cannot delete system roles
- Cannot delete roles that are currently assigned to users

### 6. Assign Role to User

**POST** `/api/v1/roles/assign`

**Permission Required**: `roles:update`

**Request Body**:
```json
{
  "userId": "60d5ec49f1b2c72b8c8e4a1c",
  "roleId": "60d5ec49f1b2c72b8c8e4a1b"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Role assigned successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4a1c",
    "name": "John Doe",
    "email": "john@example.com",
    "role": {
      "_id": "60d5ec49f1b2c72b8c8e4a1b",
      "name": "admin",
      "displayName": {
        "en": "Administrator"
      }
    }
  }
}
```

### 7. Get Users with Specific Role

**GET** `/api/v1/roles/:id/users`

**Permission Required**: `roles:read`

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4a1c",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "60d5ec49f1b2c72b8c8e4a1b",
      "isActive": true
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### 8. Clone Role

**POST** `/api/v1/roles/:id/clone`

**Permission Required**: `roles:create`

**Request Body**:
```json
{
  "newRoleName": "custom_admin"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Role cloned successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4a1d",
    "name": "custom_admin",
    "displayName": {
      "en": "Administrator (Copy)",
      "ar": "مدير (نسخة)"
    },
    "permissions": [...],
    "isSystemRole": false
  }
}
```

---

## User Management

Base URL: `/api/v1/users`

### 1. Get All Users

**GET** `/api/v1/users`

**Permission Required**: `users:read`

**Query Parameters** (supports API Features):
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: Sort by field (e.g., `-createdAt`, `name`)
- `fields`: Select specific fields (e.g., `name,email,role`)
- `isActive`: Filter by active status
- `role`: Filter by role ID
- `search`: Search by name or email

**Response**:
```json
{
  "OK": true,
  "message": "Users fetched successfully",
  "data": [
    {
      "id": "60d5ec49f1b2c72b8c8e4a1c",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+966501234567",
      "address": "Riyadh",
      "role": "60d5ec49f1b2c72b8c8e4a1b",
      "isActive": true,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 2. Get User by ID

**GET** `/api/v1/users/:id`

**Permission Required**: `users:read`

**Response**:
```json
{
  "OK": true,
  "message": "User fetched successfully",
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1c",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+966501234567",
    "address": "Riyadh",
    "role": "60d5ec49f1b2c72b8c8e4a1b",
    "isActive": true,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 3. Get User Statistics

**GET** `/api/v1/users/:id/statistics`

**Permission Required**: `users:read`

**Response**:
```json
{
  "OK": true,
  "data": {
    "user": {
      "id": "60d5ec49f1b2c72b8c8e4a1c",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "statistics": {
      "totalOrders": 25,
      "completedOrders": 20,
      "totalSpent": 15420.50,
      "accountAge": 145,
      "lastLogin": "2025-01-15T08:30:00.000Z"
    }
  }
}
```

### 4. Update User

**PUT** `/api/v1/users/:id`

**Permission Required**: `users:update`

**Request Body** (all fields optional):
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "phone": "+966501234567",
  "address": "Jeddah",
  "isActive": true
}
```

**Note**:
- Admins cannot change user passwords
- Only SuperAdmin can change roles

**Response**:
```json
{
  "OK": true,
  "message": "User updated successfully",
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1c",
    "name": "John Updated",
    "email": "john.updated@example.com"
  }
}
```

### 5. Deactivate User

**DELETE** `/api/v1/users/:id`

**Permission Required**: `users:delete`

**Response**:
```json
{
  "OK": true,
  "message": "User deactivated successfully",
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1c",
    "isActive": false
  }
}
```

### 6. Activate User

**PATCH** `/api/v1/users/:id/activate`

**Permission Required**: `users:update`

**Response**:
```json
{
  "OK": true,
  "message": "User activated successfully",
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1c",
    "isActive": true
  }
}
```

### 7. Lock User Account

**PATCH** `/api/v1/users/:id/lock`

**Permission Required**: `users:update`

**Request Body**:
```json
{
  "lockDuration": 24
}
```

**lockDuration**: Hours to lock the account (default: 24)

**Response**:
```json
{
  "OK": true,
  "message": "User locked for 24 hours",
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1c"
  }
}
```

### 8. Unlock User Account

**PATCH** `/api/v1/users/:id/unlock`

**Permission Required**: `users:update`

**Response**:
```json
{
  "OK": true,
  "message": "User unlocked successfully",
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1c"
  }
}
```

### 9. Bulk Actions

**POST** `/api/v1/users/bulk-action`

**Permission Required**: `users:update`

**Request Body**:
```json
{
  "action": "activate",
  "userIds": [
    "60d5ec49f1b2c72b8c8e4a1c",
    "60d5ec49f1b2c72b8c8e4a1d",
    "60d5ec49f1b2c72b8c8e4a1e"
  ]
}
```

**Available Actions**:
- `activate`: Activate users
- `deactivate`: Deactivate users
- `unlock`: Unlock user accounts

**Response**:
```json
{
  "OK": true,
  "message": "Users activated successfully",
  "data": {
    "modifiedCount": 3,
    "matchedCount": 3
  }
}
```

---

## Analytics & Dashboard

Base URL: `/api/v1/admin`

### 1. Dashboard Analytics

**GET** `/api/v1/admin/analytics/dashboard`

**Permission Required**: `analytics:read`

**Response**:
```json
{
  "status": "success",
  "fromCache": true,
  "data": {
    "users": {
      "total": 1250,
      "active": 1180,
      "newThisMonth": 85,
      "newLastMonth": 72,
      "growth": 18.06
    },
    "products": {
      "total": 450,
      "active": 420,
      "outOfStock": 15,
      "lowStock": 32
    },
    "orders": {
      "total": 3420,
      "pending": 45,
      "completed": 3120,
      "cancelled": 255,
      "cancellationRate": 7.46
    },
    "revenue": {
      "total": 458920.50,
      "averageOrderValue": 134.18,
      "thisMonth": 45820.30,
      "lastMonth": 42150.20,
      "growth": 8.71
    },
    "catalog": {
      "categories": 25,
      "brands": 42
    },
    "topProducts": [
      {
        "_id": "60d5ec49f1b2c72b8c8e4a1f",
        "en": {
          "name": "Samsung Refrigerator",
          "images": [...]
        },
        "salesCount": 245,
        "price": 2499
      }
    ],
    "recentOrders": [...]
  }
}
```

**Cache**: 5 minutes

### 2. User Analytics

**GET** `/api/v1/admin/analytics/users`

**Permission Required**: `analytics:read`

**Query Parameters**:
- `period`: `week`, `month`, `year` (default: `month`)

**Response**:
```json
{
  "status": "success",
  "data": {
    "userGrowth": [
      {
        "_id": { "year": 2025, "month": 1, "day": 15 },
        "count": 12
      }
    ],
    "roleDistribution": [
      {
        "_id": "user",
        "count": 1180
      },
      {
        "_id": "admin",
        "count": 5
      }
    ]
  }
}
```

### 3. Sales Analytics

**GET** `/api/v1/admin/analytics/sales`

**Permission Required**: `analytics:read`

**Query Parameters**:
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response**:
```json
{
  "status": "success",
  "data": {
    "salesByDay": [
      {
        "_id": { "year": 2025, "month": 1, "day": 15 },
        "totalSales": 12450.50,
        "orderCount": 45
      }
    ],
    "salesByStatus": [
      {
        "_id": "delivered",
        "count": 3120,
        "totalAmount": 418920.50
      }
    ]
  }
}
```

### 4. Product Analytics

**GET** `/api/v1/admin/analytics/products`

**Permission Required**: `analytics:read`

**Response**:
```json
{
  "status": "success",
  "data": {
    "categoryDistribution": [
      {
        "_id": "60d5ec49f1b2c72b8c8e4a20",
        "category": "Refrigerators",
        "categoryAr": "ثلاجات",
        "count": 85
      }
    ],
    "brandDistribution": [
      {
        "_id": "60d5ec49f1b2c72b8c8e4a21",
        "brand": "Samsung",
        "brandAr": "سامسونج",
        "count": 120,
        "totalSales": 2450
      }
    ],
    "priceRanges": [
      {
        "_id": 100,
        "count": 45
      },
      {
        "_id": 500,
        "count": 120
      }
    ]
  }
}
```

### 5. System Statistics

**GET** `/api/v1/admin/system/stats`

**Permission Required**: `analytics:read`

**Response**:
```json
{
  "status": "success",
  "data": {
    "database": {
      "users": 1250,
      "products": 450,
      "orders": 3420,
      "categories": 25,
      "brands": 42
    },
    "storage": {
      "uploadsCount": 0,
      "totalSize": "0 MB"
    },
    "cache": {
      "status": "connected"
    }
  }
}
```

---

## Permissions System

### How Permissions Work

1. **Hierarchical Structure**:
   - SuperAdmin (legacy role) bypasses all permission checks
   - Custom roles use granular permission system

2. **Resource-Based**: Each role has permissions for specific resources

3. **Action-Based**: Each resource can have different action permissions

### Middleware Usage

```javascript
import { requirePermission, requireAnyPermission, requireAllPermissions, isSuperAdmin } from "../middlewares/permission.middleware.js";

// Single permission
router.post("/products", requirePermission("products", "create"), createProduct);

// Any of multiple permissions
router.get("/data", requireAnyPermission([
  { resource: "products", action: "read" },
  { resource: "orders", action: "read" }
]), getData);

// All permissions required
router.post("/advanced", requireAllPermissions([
  { resource: "products", action: "create" },
  { resource: "categories", action: "create" }
]), advancedOperation);

// SuperAdmin only
router.delete("/dangerous", isSuperAdmin, dangerousOperation);
```

### Default Roles

The system comes with 7 pre-configured roles:

1. **Super Admin** (`super_admin`)
   - Full access to all resources and actions
   - System role (cannot be deleted)
   - Priority: 100

2. **Administrator** (`admin`)
   - Full access to most resources
   - Cannot delete users or manage roles
   - System role
   - Priority: 90

3. **Manager** (`manager`)
   - Can manage products, orders, view analytics
   - Limited user access
   - System role
   - Priority: 70

4. **Content Manager** (`content_manager`)
   - Manages products, categories, home page
   - Cannot access orders or users
   - Custom role
   - Priority: 60

5. **Sales Manager** (`sales_manager`)
   - Manages orders, coupons, analytics
   - Read-only product access
   - Custom role
   - Priority: 65

6. **Customer Support** (`customer_support`)
   - Handles customer orders and reviews
   - Limited access
   - Custom role
   - Priority: 50

7. **Viewer** (`viewer`)
   - Read-only access
   - Can view data but not modify
   - Custom role
   - Priority: 10

### Seeding Roles

Roles are automatically seeded on application startup. To manually seed:

```javascript
import seedRoles from "./config/seedRoles.js";
await seedRoles();
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description",
  "errors": [] // Optional validation errors
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Best Practices

1. **Always Use Specific Permissions**: Instead of checking roles, check specific permissions
2. **Cache Optimization**: Analytics data is cached for 5 minutes, roles for 1 hour
3. **Bulk Operations**: Use bulk actions for operating on multiple users
4. **Role Management**: Clone existing roles to create new ones instead of starting from scratch
5. **Security**: Never assign `superAdmin` legacy role unless absolutely necessary

---

## Examples

### Creating a Custom "Marketing Manager" Role

```bash
POST /api/v1/roles
Authorization: Bearer <token>

{
  "name": "marketing_manager",
  "displayName": {
    "en": "Marketing Manager",
    "ar": "مدير التسويق"
  },
  "description": {
    "en": "Manages marketing campaigns and promotions",
    "ar": "يدير الحملات التسويقية والعروض الترويجية"
  },
  "permissions": [
    {
      "resource": "products",
      "actions": { "create": false, "read": true, "update": true, "delete": false }
    },
    {
      "resource": "coupons",
      "actions": { "create": true, "read": true, "update": true, "delete": true }
    },
    {
      "resource": "home",
      "actions": { "create": false, "read": true, "update": true, "delete": false }
    },
    {
      "resource": "analytics",
      "actions": { "create": false, "read": true, "update": false, "delete": false, "export": true }
    }
  ],
  "priority": 68,
  "isActive": true
}
```

### Bulk Activating Users

```bash
POST /api/v1/users/bulk-action
Authorization: Bearer <token>

{
  "action": "activate",
  "userIds": [
    "60d5ec49f1b2c72b8c8e4a1c",
    "60d5ec49f1b2c72b8c8e4a1d",
    "60d5ec49f1b2c72b8c8e4a1e"
  ]
}
```

### Getting Dashboard Analytics

```bash
GET /api/v1/admin/analytics/dashboard
Authorization: Bearer <token>
```

---

## Support

For issues or questions, please refer to the project repository or contact the development team.
