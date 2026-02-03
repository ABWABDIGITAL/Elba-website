import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";


const defaultRoles = [
  {
  name: "user",
  displayName: {
    en: "User",
    ar: "مستخدم",
  },
  description: {
    en: "Default role for registered customers",
    ar: "الدور الافتراضي للمستخدمين المسجلين",
  },
  isSystemRole: true,   // cannot be deleted
  priority: 1,          // lowest priority among system roles
  permissions: [],      // no admin access
},
  {
    name: "super_admin",
    displayName: {
      en: "Super Admin",
      ar: "مدير رئيسي",
    },
    description: {
      en: "Full system access with all permissions",
      ar: "وصول كامل للنظام مع جميع الصلاحيات",
    },
    isSystemRole: true,
    priority: 100,
    permissions: [
      {
        resource: "users",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "products",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "categories",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "brands",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "orders",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "reviews",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "coupons",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "catalogs",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "home",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "branches",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "cart",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "analytics",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "roles",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "settings",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "tickets",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: false },
      },
      {
        resource: "chat",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: false },
      },
      {
        resource: "embeddings",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
    ],
  },
  {
    name: "admin",
    displayName: {
      en: "Administrator",
      ar: "مدير",
    },
    description: {
      en: "Full access to manage products, orders, and users",
      ar: "وصول كامل لإدارة المنتجات والطلبات والمستخدمين",
    },
    isSystemRole: true,
    priority: 90,
    permissions: [
      {
        resource: "users",
        actions: { create: true, read: true, update: true, delete: false, export: true, import: false },
      },
      {
        resource: "products",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: true },
      },
      {
        resource: "categories",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: false },
      },
      {
        resource: "brands",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: false },
      },
      {
        resource: "orders",
        actions: { create: true, read: true, update: true, delete: false, export: true, import: false },
      },
      {
        resource: "reviews",
        actions: { create: false, read: true, update: true, delete: true, export: true, import: false },
      },
      {
        resource: "coupons",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: false },
      },
      {
        resource: "catalogs",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: false },
      },
      {
        resource: "home",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "branches",
        actions: { create: true, read: true, update: true, delete: true, export: true, import: false },
      },
      {
        resource: "analytics",
        actions: { create: false, read: true, update: false, delete: false, export: true, import: false },
      },
      {
        resource: "roles",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
      {
        resource: "tickets",
        actions: { create: true, read: true, update: true, delete: false, export: true, import: false },
      },
      {
        resource: "chat",
        actions: { create: false, read: true, update: false, delete: true, export: true, import: false },
      },
      {
        resource: "embeddings",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
    ],
  },
  {
    name: "manager",
    displayName: {
      en: "Manager",
      ar: "مشرف",
    },
    description: {
      en: "Can manage products, orders, and view analytics",
      ar: "يمكنه إدارة المنتجات والطلبات وعرض التحليلات",
    },
    isSystemRole: true,
    priority: 70,
    permissions: [
      {
        resource: "users",
        actions: { create: false, read: true, update: false, delete: false, export: true, import: false },
      },
      {
        resource: "products",
        actions: { create: true, read: true, update: true, delete: false, export: true, import: true },
      },
      {
        resource: "categories",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "brands",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "orders",
        actions: { create: true, read: true, update: true, delete: false, export: true, import: false },
      },
      {
        resource: "reviews",
        actions: { create: false, read: true, update: true, delete: true, export: false, import: false },
      },
      {
        resource: "coupons",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "analytics",
        actions: { create: false, read: true, update: false, delete: false, export: true, import: false },
      },
    ],
  },
  {
    name: "content_manager",
    displayName: {
      en: "Content Manager",
      ar: "مدير المحتوى",
    },
    description: {
      en: "Manages products, categories, and home page content",
      ar: "يدير المنتجات والفئات ومحتوى الصفحة الرئيسية",
    },
    isSystemRole: false,
    priority: 60,
    permissions: [
      {
        resource: "products",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "categories",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "brands",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "catalogs",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "home",
        actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "reviews",
        actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
      },
    ],
  },
  {
    name: "sales_manager",
    displayName: {
      en: "Sales Manager",
      ar: "مدير المبيعات",
    },
    description: {
      en: "Manages orders, coupons, and views sales analytics",
      ar: "يدير الطلبات والكوبونات ويعرض تحليلات المبيعات",
    },
    isSystemRole: false,
    priority: 65,
    permissions: [
      {
        resource: "orders",
        actions: { create: true, read: true, update: true, delete: false, export: true, import: false },
      },
      {
        resource: "coupons",
        actions: { create: true, read: true, update: true, delete: true, export: false, import: false },
      },
      {
        resource: "users",
        actions: { create: false, read: true, update: false, delete: false, export: true, import: false },
      },
      {
        resource: "products",
        actions: { create: false, read: true, update: false, delete: false, export: true, import: false },
      },
      {
        resource: "analytics",
        actions: { create: false, read: true, update: false, delete: false, export: true, import: false },
      },
    ],
  },
  {
    name: "customer_support",
    displayName: {
      en: "Customer Support",
      ar: "دعم العملاء",
    },
    description: {
      en: "Handles customer orders and reviews",
      ar: "يتعامل مع طلبات العملاء والمراجعات",
    },
    isSystemRole: false,
    priority: 50,
    permissions: [
      {
        resource: "orders",
        actions: { create: false, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "users",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
      {
        resource: "products",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
      {
        resource: "reviews",
        actions: { create: false, read: true, update: true, delete: true, export: false, import: false },
      },
      {
        resource: "tickets",
        actions: { create: true, read: true, update: true, delete: false, export: false, import: false },
      },
      {
        resource: "chat",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
    ],
  },
  {
    name: "viewer",
    displayName: {
      en: "Viewer",
      ar: "مشاهد",
    },
    description: {
      en: "Read-only access to view data",
      ar: "وصول للقراءة فقط لعرض البيانات",
    },
    isSystemRole: false,
    priority: 10,
    permissions: [
      {
        resource: "products",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
      {
        resource: "categories",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
      {
        resource: "brands",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
      {
        resource: "orders",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
      {
        resource: "analytics",
        actions: { create: false, read: true, update: false, delete: false, export: false, import: false },
      },
    ],
  },
];

export const seedAdmin = async () => {
  try {
    await seedRoles();
    const adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) throw new Error("Admin role not found");

    const adminData = {
      name: "Admin",
      email: "admin10@elba.com",
      phone: "+966512548678",
      password: "123456",
      role: adminRole._id,
      isActive: true,
      legacyRole: "admin",
    };

    // 🔥 Split name for seeder only
    const parts = adminData.name.trim().split(" ");

    if (parts.length === 1) {
      adminData.firstName = parts[0];
      adminData.lastName = parts[0];
    } else {
      adminData.firstName = parts[0];
      adminData.lastName = parts.slice(1).join(" ");
    }

    // 🔍 Check if admin exists
    let admin = await User.findOne({ email: adminData.email });

    if (admin) {
      // Update all fields including password
      Object.assign(admin, adminData);
      await admin.save(); // ensures password hashing
      console.log("✅ Admin user updated");
    } else {
      admin = await User.create(adminData);
      console.log("✅ Admin user created");
    }

    return admin;

  } catch (error) {
    console.error("❌ Error in seedAdmin:", error.message);
    throw error;
  }
};


export const seedRoles = async () => {
  try {
    console.log("🌱 Seeding default roles...");

    for (const roleData of defaultRoles) {
      const existing = await Role.findOne({ name: roleData.name });

      if (!existing) {
        await Role.create(roleData);
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        console.log(`⏭️  Role already exists: ${roleData.name}`);
      }
    }

    console.log("✅ Role seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding roles:", error.message);
    throw error;
  }
};

export default seedRoles;
