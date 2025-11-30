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
import errorMiddleware from "./middlewares/error.middleware.js"
import catalogRoutes from "./routes/catalog.route.js";
import homeRoutes from "./routes/home.route.js";
import couponRoutes from "./routes/coupon.route.js";
import branchRoutes from "./routes/branches.route.js";
connectDB();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth" , authRoutes);
app.use("/api/v1/categories" , categoryRoutes);
app.use("/api/v1/brands" , brandRoutes);
app.use("/api/v1/products" , productRoutes);
app.use("/api/v1/users" , userRoutes);
app.use("/api/v1/reviews" , reviewRoutes);
app.use("/api/v1/catalogs" , catalogRoutes);
app.use("/api/v1/home" , homeRoutes);
app.use("/api/v1/coupons" , couponRoutes);
app.use("/api/v1/branches" , branchRoutes);
app.use("/uploads" , express.static(path.join(process.cwd(), "uploads")));
app.use(errorMiddleware);
app.listen(PORT, () => {
    console.log("MongoDB connected");
    console.log(`Server running on port ${PORT}`);
});
