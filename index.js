import express from "express";
import "dotenv/config";
import path from "path";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import categoryRoutes from "./routes/categories.route.js";
import brandRoutes from "./routes/brand.route.js";
import productRoutes from "./routes/product.route.js";
import userRoutes from "./routes/user.route.js";
import reviewRoutes from "./routes/review.route.js";
import cartRoutes from "./routes/cart.route.js";
import orderRoutes from "./routes/order.route.js";
import errorMiddleware from "./middlewares/error.middleware.js"
import homeRoutes from "./routes/home.route.js";
import couponRoutes from "./routes/coupon.route.js";
import branchRoutes from "./routes/branches.route.js";
import roleRoutes from "./routes/role.route.js";
import adminRoutes from "./routes/admin.route.js";
import notificationRoutes from "./routes/notification.route.js";
import blogRoutes from "./routes/blog.route.js";
import staticPageRoutes from "./routes/staticPage.route.js";
import emailPosterRoutes from "./routes/emailPoster.route.js";
import favoriteRoutes from "./routes/favorite.route.js";
import newsletterRoutes from "./routes/newsletter.route.js";
import addressRoutes from "./routes/address.route.js";
import paymentRoutes from "./routes/payment.routes.js";
import profileRoutes from "./routes/profile.route.js";
import settingsRoutes from "./routes/settings.route.js";
import chatRoutes from "./routes/chat.route.js";
import searchRoutes from "./routes/search.routes.js";
import communicationRoutes from "./routes/communicationInfo.route.js";
import analyticsRouter  from "./routes/analytics.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import seedRoles , { seedAdmin } from "./config/seedRoles.js";
import runSeeder from "./config/seeder.js";

import cors from "cors";
import { MongoClient } from "mongodb";

// Import server monitoring module
import { setupMonitoring, bodySecurityMiddleware } from "./middlewares/serverMonitor.middleware.js";
// Import business analytics module
import { setupBusinessAnalytics } from "./middlewares/businessAnalytics.middleware.js";

const client = new MongoClient(process.env.MONGO_URI);
// Set to true to run seeder on startup (disable after first run)
const RUN_SEEDER = process.env.RUN_SEEDER === "true";

connectDB().then(async () => {
//   Seed default roles on startup
  await seedRoles();
 await seedAdmin();
//   Run comprehensive seeder if enabled
  if (RUN_SEEDER) {
    await runSeeder();
  }
});

const app = express();

const PORT = process.env.PORT || 3000;

// Setup server monitoring (security + analytics + status endpoints)
// This must be called before other middleware for proper request tracking
setupMonitoring(app, {
  mongoClient: client,
  appName: 'Alba E-Commerce API',
  loginPath: '/auth/login',
});

// Setup business analytics (user tracking, conversion funnels, business metrics)
setupBusinessAnalytics(app, {
  appName: 'Alba E-Commerce',
  basePath: '/analytics',
  excludePaths: ['/health', '/status', '/analytics', '/favicon.ico', '/uploads'],
  customFunnels: {
    'product_purchase': {
      name: 'Product Purchase Journey',
      steps: ['landing', 'view_product', 'add_to_cart', 'checkout', 'payment', 'order_complete'],
    },
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodySecurityMiddleware); // Check request bodies for malicious content
app.use("/uploads", express.static("uploads"));

app.use("/api/v1/auth" , authRoutes);
app.use("/api/v1/home" , homeRoutes);
app.use("/api/v1/products" , productRoutes);
app.use("/api/v1/categories" , categoryRoutes);
app.use("/api/v1/brands" , brandRoutes);
app.use("/api/v1/users" , userRoutes);
app.use("/api/v1/reviews" , reviewRoutes);
app.use("/api/v1/cart" , cartRoutes);
app.use("/api/v1/orders" , orderRoutes);
app.use("/api/v1/coupons" , couponRoutes);
app.use("/api/v1/branches" , branchRoutes);
app.use("/api/v1/roles" , roleRoutes);
app.use("/api/v1/admin" , adminRoutes);
app.use("/api/v1/notifications" , notificationRoutes);
app.use("/api/v1/blogs" , blogRoutes);
app.use("/api/v1/pages" , staticPageRoutes);
app.use("/api/v1/emailPosters" , emailPosterRoutes);
app.use("/api/v1" , favoriteRoutes);
app.use("/api/v1/newsletter" , newsletterRoutes);
app.use("/api/v1/addresses" , addressRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/staticPages", staticPageRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/communicationInfo", communicationRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/uploads" , express.static(path.join(process.cwd(), "uploads")));
app.use(errorMiddleware);

app.listen(PORT, "0.0.0.0", () => {
    console.log("MongoDB connected");
    console.log(`Server running on port ${PORT}`);
    console.log(`Accepting connections from all network interfaces (0.0.0.0)`);
});
