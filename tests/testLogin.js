import "dotenv/config";

const API_URL = process.env.API_URL || "http://localhost:3000";
const BASE_URL = `${API_URL}/api/v1`;

/* --------------------------------------------------
   TEST CREDENTIALS
--------------------------------------------------- */
const testUsers = [
  {
    role: "Super Admin",
    phone: "+966500000001",
    password: "SuperAdmin@123",
  },
  {
    role: "Admin",
    phone: "+966500000002",
    password: "Admin@123",
  },
  {
    role: "Manager",
    phone: "+966500000003",
    password: "Manager@123",
  },
  {
    role: "Regular User",
    phone: "+966500000004",
    password: "User@123",
  },
  {
    role: "Regular User (Ahmed)",
    phone: "+966500000005",
    password: "Password@123",
  },
  {
    role: "Regular User (Fatima)",
    phone: "+966500000006",
    password: "Password@123",
  },
];

/* --------------------------------------------------
   LOGIN FUNCTION
--------------------------------------------------- */
const testLogin = async (phone, password, roleName) => {
  try {
    console.log(`\n🔐 Testing login for: ${roleName}`);
    console.log(`   Phone: ${phone}`);

    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, password }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Login successful!`);
      console.log(`   Token: ${data.data.token.substring(0, 20)}...`);
      console.log(`   User: ${data.data.user.name}`);
      console.log(`   Email: ${data.data.user.email}`);
      console.log(`   Legacy Role: ${data.data.user.legacyRole}`);

      if (data.data.user.role) {
        console.log(`   Role ID: ${data.data.user.role}`);
      }

      return { success: true, data: data.data };
    } else {
      console.log(`   ❌ Login failed!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${data.message || "Unknown error"}`);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`   ❌ Error during login!`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/* --------------------------------------------------
   TEST PROTECTED ROUTES
--------------------------------------------------- */
const testProtectedRoute = async (token, roleName, endpoint, method = "GET") => {
  try {
    console.log(`\n🔒 Testing protected route for ${roleName}: ${method} ${endpoint}`);

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Access granted (${response.status})`);
      return { success: true, data };
    } else {
      console.log(`   ❌ Access denied (${response.status})`);
      console.log(`   Message: ${data.message || "Unknown error"}`);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/* --------------------------------------------------
   MAIN TEST RUNNER
--------------------------------------------------- */
const runLoginTests = async () => {
  console.log("=".repeat(60));
  console.log("🧪 ELBA E-COMMERCE - LOGIN TEST SUITE");
  console.log("=".repeat(60));
  console.log(`📡 API URL: ${BASE_URL}`);
  console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
  console.log("=".repeat(60));

  const results = {
    total: testUsers.length,
    successful: 0,
    failed: 0,
    tokens: {},
  };

  // Test login for all users
  for (const user of testUsers) {
    const result = await testLogin(user.phone, user.password, user.role);

    if (result.success) {
      results.successful++;
      results.tokens[user.role] = result.data.token;
    } else {
      results.failed++;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 LOGIN TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successful logins: ${results.successful}/${results.total}`);
  console.log(`❌ Failed logins: ${results.failed}/${results.total}`);

  // Test protected routes with different roles
  if (results.tokens["Super Admin"]) {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 TESTING PROTECTED ROUTES - SUPER ADMIN");
    console.log("=".repeat(60));

    await testProtectedRoute(results.tokens["Super Admin"], "Super Admin", "/users");
    await testProtectedRoute(results.tokens["Super Admin"], "Super Admin", "/products");
    await testProtectedRoute(results.tokens["Super Admin"], "Super Admin", "/roles");
    await testProtectedRoute(results.tokens["Super Admin"], "Super Admin", "/admin/analytics/dashboard");
  }

  if (results.tokens["Admin"]) {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 TESTING PROTECTED ROUTES - ADMIN");
    console.log("=".repeat(60));

    await testProtectedRoute(results.tokens["Admin"], "Admin", "/users");
    await testProtectedRoute(results.tokens["Admin"], "Admin", "/products");
  }

  if (results.tokens["Manager"]) {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 TESTING PROTECTED ROUTES - MANAGER");
    console.log("=".repeat(60));

    await testProtectedRoute(results.tokens["Manager"], "Manager", "/products");
  }

  if (results.tokens["Regular User"]) {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 TESTING PROTECTED ROUTES - REGULAR USER");
    console.log("=".repeat(60));

    await testProtectedRoute(results.tokens["Regular User"], "Regular User", "/products");
    await testProtectedRoute(results.tokens["Regular User"], "Regular User", "/cart");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ ALL TESTS COMPLETED!");
  console.log("=".repeat(60));
};

// Run tests
runLoginTests().catch(console.error);
