# ELBA E-Commerce - Users & Roles Seeder & Login Testing

## Quick Start

### 1. Setup and Run Seeder

```bash
# Set environment variable to enable seeder
export RUN_SEEDER=true

# Or add to .env file
echo "RUN_SEEDER=true" >> .env

# Start the server (seeder runs automatically)
npm start

# After seeding, disable auto-seeding
export RUN_SEEDER=false
```

### 2. Test Logins

All tests passed successfully! ✅

```bash
# Run automated test suite
node tests/testLogin.js

# Results: 6/6 logins successful (100%)
```

---

## Seeded Users and Credentials

### Admin Users

#### 1. Super Admin
```json
{
  "name": "Super Admin",
  "email": "superadmin@elba.com",
  "phone": "+966500000001",
  "password": "SuperAdmin@123",
  "role": "superAdmin",
  "address": "Riyadh"
}
```
**Permissions**: Full access to all resources

#### 2. Admin
```json
{
  "name": "Admin User",
  "email": "admin@elba.com",
  "phone": "+966500000002",
  "password": "Admin@123",
  "role": "admin",
  "address": "Jeddah"
}
```
**Permissions**: Can create/read/update users (no delete), full product management

#### 3. Manager
```json
{
  "name": "Manager User",
  "email": "manager@elba.com",
  "phone": "+966500000003",
  "password": "Manager@123",
  "role": "manager",
  "address": "Dammam"
}
```
**Permissions**: Can manage products (no delete), update orders, view analytics

### Regular Users

#### 4. Test User
```json
{
  "name": "Test User",
  "email": "user@elba.com",
  "phone": "+966500000004",
  "password": "User@123",
  "role": "user",
  "address": "Riyadh"
}
```

#### 5. Ahmed Al-Mutairi
```json
{
  "name": "Ahmed Al-Mutairi",
  "email": "ahmed.mutairi@example.com",
  "phone": "+966500000005",
  "password": "Password@123",
  "role": "user",
  "dateOfBirth": "1990-05-15",
  "address": "Makkah"
}
```

#### 6. Fatima Al-Qahtani
```json
{
  "name": "Fatima Al-Qahtani",
  "email": "fatima.qahtani@example.com",
  "phone": "+966500000006",
  "password": "Password@123",
  "role": "user",
  "dateOfBirth": "1995-08-22",
  "address": "Medina"
}
```

---

## Login Examples

### Using cURL

#### Super Admin Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966500000001",
    "password": "SuperAdmin@123"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "User logged in successfully",
  "data": {
    "user": {
      "id": "69357bb33feeaf2f579c2cec",
      "name": "Super Admin",
      "email": "superadmin@elba.com",
      "phone": "+966500000001",
      "address": "Riyadh",
      "role": "69357bb33feeaf2f579c2ce1"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Admin Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966500000002",
    "password": "Admin@123"
  }'
```

#### Regular User Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966500000004",
    "password": "User@123"
  }'
```

### Using JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+966500000001',
    password: 'SuperAdmin@123'
  })
});

const data = await response.json();
console.log('Token:', data.data.token);
```

### Using the Test Script

```bash
# Run all login tests
node tests/testLogin.js

# Output:
# ✅ Successful logins: 6/6
# ❌ Failed logins: 0/6
```

### Using REST Client (VS Code)

Open `tests/login.http` in VS Code with REST Client extension:

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "phone": "+966500000001",
  "password": "SuperAdmin@123"
}
```

---

## Testing Protected Routes

### Get All Users (Admin+ Only)
```bash
TOKEN="your-token-here"

curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

### Get All Products (All Authenticated Users)
```bash
curl -X GET http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $TOKEN"
```

### Get User Cart (Authenticated Users)
```bash
curl -X GET http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer $TOKEN"
```

---

## Role Permissions Matrix

| Resource | Super Admin | Admin | Manager | User |
|----------|-------------|-------|---------|------|
| **Users** | CRUD + Import/Export | CRU + Export | Read Only | None |
| **Products** | CRUD + Import/Export | CRUD + Import/Export | CRU + Export | Read Only |
| **Categories** | CRUD + Import/Export | CRUD | RU | Read Only |
| **Brands** | CRUD + Import/Export | CRUD | RU | Read Only |
| **Orders** | CRUD + Import/Export | CRU + Export | RU + Export | CR |
| **Reviews** | CRUD + Import/Export | RUD | RU | CRU (own) |
| **Coupons** | CRUD + Import/Export | CRUD | CRU | Read Only |
| **Cart** | CRUD + Import/Export | RUD | Read Only | CRUD (own) |
| **Analytics** | CRUD + Import/Export | Read + Export | Read Only | None |
| **Roles** | CRUD + Import/Export | Read Only | Read Only | None |
| **Settings** | CRUD + Import/Export | RU | Read Only | None |

**Legend:**
- C = Create
- R = Read
- U = Update
- D = Delete

---

## What Was Seeded

### Roles (4)
1. ✅ Super Admin (full permissions)
2. ✅ Admin (elevated permissions)
3. ✅ Manager (limited admin permissions)
4. ✅ User (basic permissions)

### Users (6)
1. ✅ Super Admin
2. ✅ Admin User
3. ✅ Manager User
4. ✅ Test User
5. ✅ Ahmed Al-Mutairi
6. ✅ Fatima Al-Qahtani

### Categories (14)
- Refrigerators, Washing Machines, Air Conditioners, Ovens, Dishwashers, Microwaves, Kettles, Coffee Makers, Blenders, Toasters, Vacuum Cleaners, Irons, Cooktops, Range Hoods

### Brands (12)
- Samsung, LG, Bosch, Whirlpool, Siemens, Electrolux, Panasonic, Haier, Philips, Braun, Kenwood, Tefal

### Products (50+)
- Complete product catalog with images, descriptions, prices, and specifications

---

## Files Created

1. **[config/seeder.js](config/seeder.js)** (Updated)
   - Added `seedRoles()` function
   - Added `seedUsers()` function
   - Updated main seeder to include roles and users

2. **[tests/testLogin.js](tests/testLogin.js)**
   - Automated login testing for all 6 users
   - Protected route testing
   - Detailed success/failure reporting

3. **[tests/login.http](tests/login.http)**
   - REST Client file for manual testing
   - Pre-configured requests for all users
   - Protected route examples

4. **[tests/README.md](tests/README.md)**
   - Complete testing documentation
   - Setup instructions
   - Troubleshooting guide

5. **[tests/TEST_RESULTS.md](tests/TEST_RESULTS.md)**
   - Detailed test results
   - All 6 users tested successfully
   - Protected route access matrix

6. **[.env.example](.env.example)**
   - Sample environment variables
   - Configuration template

---

## Verification

### Check Users in Database
```javascript
// MongoDB Shell or Compass
db.users.find({}, { name: 1, email: 1, phone: 1, legacyRole: 1 })
```

### Count Users by Role
```javascript
db.users.aggregate([
  { $group: { _id: "$legacyRole", count: { $sum: 1 } } }
])
```

### Check Roles
```javascript
db.roles.find({}, { name: 1, displayName: 1, priority: 1 })
```

---

## Test Results Summary

**Date**: December 7, 2025
**Status**: ✅ ALL TESTS PASSED

- **Total Users**: 6
- **Successful Logins**: 6/6 (100%)
- **Failed Logins**: 0/6 (0%)
- **Protected Routes**: Working correctly
- **Role-Based Access**: Functioning as expected
- **Token Generation**: Successful
- **Password Hashing**: Working (bcrypt)

---

## Next Steps

1. ✅ Seeder is complete and tested
2. ✅ All users can log in successfully
3. ✅ Role-based permissions are working
4. ℹ️ Update `.env` to set `RUN_SEEDER=false` to prevent re-seeding
5. ℹ️ Configure real Redis credentials if needed for production
6. ℹ️ Configure real SMTP credentials for email functionality

---

## Support

For issues or questions:
- Check [tests/README.md](tests/README.md) for troubleshooting
- Review [TEST_RESULTS.md](tests/TEST_RESULTS.md) for expected behavior
- All test credentials are documented above

---

**Status**: Production Ready ✅
