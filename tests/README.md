# ELBA E-Commerce Login Testing Guide

## Test Users and Credentials

All test users are created via the seeder in `config/seeder.js`.

### Admin Users

| Role | Name | Email | Phone | Password |
|------|------|-------|-------|----------|
| Super Admin | Super Admin | superadmin@elba.com | +966500000001 | SuperAdmin@123 |
| Admin | Admin User | admin@elba.com | +966500000002 | Admin@123 |
| Manager | Manager User | manager@elba.com | +966500000003 | Manager@123 |

### Regular Users

| Role | Name | Email | Phone | Password |
|------|------|-------|-------|----------|
| User | Test User | user@elba.com | +966500000004 | User@123 |
| User | Ahmed Al-Mutairi | ahmed.mutairi@example.com | +966500000005 | Password@123 |
| User | Fatima Al-Qahtani | fatima.qahtani@example.com | +966500000006 | Password@123 |

## Setup Instructions

### 1. Run the Database Seeder

First, ensure your MongoDB is running, then seed the database:

```bash
# Add this to your .env file
RUN_SEEDER=true

# Start the server (seeder will run automatically)
npm run dev

# After seeding completes, stop the server and set RUN_SEEDER=false
# to prevent re-seeding on every restart
```

Alternatively, you can run the seeder programmatically:

```javascript
import runSeeder from './config/seeder.js';
import connectDB from './config/db.js';

await connectDB();
await runSeeder();
```

### 2. Start the Server

```bash
npm run dev
```

The server should be running on `http://localhost:3000` (or the port specified in your .env file).

## Testing Methods

### Method 1: Using the Node.js Test Script

Run the automated test script:

```bash
node tests/testLogin.js
```

This will:
- Test login for all 6 users
- Display success/failure for each login
- Show user details and tokens
- Test protected routes for different roles

### Method 2: Using REST Client (VS Code)

1. Install the "REST Client" extension in VS Code
2. Open `tests/login.http`
3. Click "Send Request" above any request to test it
4. Copy the token from a successful login response
5. Replace `YOUR_TOKEN_HERE` in the protected routes section
6. Test protected routes with different role tokens

### Method 3: Using cURL

#### Login as Super Admin
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966500000001",
    "password": "SuperAdmin@123"
  }'
```

#### Login as Admin
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966500000002",
    "password": "Admin@123"
  }'
```

#### Login as Manager
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966500000003",
    "password": "Manager@123"
  }'
```

#### Login as Regular User
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966500000004",
    "password": "User@123"
  }'
```

#### Test Protected Route (Replace TOKEN with actual token)
```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer TOKEN"
```

### Method 4: Using Postman

1. Import the following requests:
   - **POST** `http://localhost:3000/api/v1/auth/login`
   - Body: `{ "phone": "+966500000001", "password": "SuperAdmin@123" }`

2. Save the token from the response

3. Test protected routes with the token in the Authorization header:
   - Header: `Authorization: Bearer YOUR_TOKEN`

## Expected Behavior by Role

### Super Admin
- ✅ Can access all endpoints
- ✅ Full CRUD on users, products, categories, brands, orders, etc.
- ✅ Can manage roles
- ✅ Can access analytics

### Admin
- ✅ Can create/read/update users (cannot delete)
- ✅ Full access to products, categories, brands
- ✅ Can manage orders (cannot delete)
- ✅ Can view analytics (cannot modify)
- ❌ Cannot manage roles
- ❌ Limited settings access

### Manager
- ✅ Can view users (no create/update/delete)
- ✅ Can manage products (no delete)
- ✅ Can update orders
- ✅ Can view analytics
- ❌ Cannot manage users
- ❌ Cannot delete products or orders

### Regular User
- ✅ Can view products, categories, brands
- ✅ Can create and manage orders
- ✅ Can write and edit own reviews
- ✅ Can manage own cart
- ❌ Cannot access admin routes
- ❌ Cannot access user management
- ❌ Cannot access analytics

## Troubleshooting

### Login Fails - "User not found"
- Make sure you've run the seeder first
- Check that MongoDB is running and connected
- Verify the phone number format is correct

### Login Fails - "Invalid credentials"
- Double-check the password (case-sensitive)
- Ensure you're using the correct phone number

### Protected Route Returns 401
- Ensure the token is included in the Authorization header
- Check token format: `Bearer YOUR_TOKEN`
- Verify the token hasn't expired (1 day expiration)

### Protected Route Returns 403
- The user doesn't have permission for this resource
- Check the role's permissions in the database
- Verify you're testing with the correct role

## Database Verification

To verify users were created correctly:

```javascript
// In MongoDB shell or Compass
db.users.find({}, { name: 1, email: 1, phone: 1, legacyRole: 1 })

// Or count users by role
db.users.aggregate([
  { $group: { _id: "$legacyRole", count: { $sum: 1 } } }
])
```

## Notes

- Login uses **phone number** (not email) as per the authentication controller
- All passwords are hashed using bcrypt before storage
- Tokens expire after 1 day
- All test users are pre-verified (passwordVerified: true)
- Super Admin has priority 100, Admin 80, Manager 60, User 10
