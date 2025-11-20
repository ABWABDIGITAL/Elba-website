import express from "express";
import "dotenv/config";
import path from "path";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import categoryRoutes from "./routes/categories.route.js";
connectDB();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/v1/auth" , authRoutes);
app.use("/api/v1/categories" , categoryRoutes);

app.use("/uploads" , express.static(path.join(process.cwd(), "uploads")));

app.listen(PORT, () => {
    console.log("MongoDB connected");
    console.log(`Server running on port ${PORT}`);
});
