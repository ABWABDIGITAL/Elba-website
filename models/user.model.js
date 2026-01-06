import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10; // Good balance between security and speed

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "firstName is required"],
      trim: true,
      maxlength: 50,
      minlength: 3,
    },
    lastName: {
      type: String,
      required: [true, "lastName is required"],
      trim: true,
      maxlength: 50,
      minlength: 3,
    },
    profileName: {
      type: String,
      trim: true,
      maxlength: 50,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      unique: true,
      trim: true,
      // Remove index: true here, we'll define it below properly
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      maxlength: 100,
      select: false,
    },
    dateOfBirth: { 
      type: Date, 
      default: null 
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "male",
    },
    phone: {
      type: String,
      required: [true, "Please enter your phone number"],
      unique: true,
      trim: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    legacyRole: {
      type: String,
      enum: ["user", "admin", "manager", "superAdmin"],
      default: "user",
    },
    address: {
      type: String,
      enum: [
        "Riyadh", "Jeddah", "Dammam", "Khobar", "Medina",
        "Makkah", "Qassim", "Tabuk", "Abha", "Jazan",
        "Hail", "Najran"
      ],
      default: "Riyadh",
    },
    resetPasswordCode: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    passwordVerified: { 
      type: Boolean, 
      default: false 
    },
    status: { 
      type: String, 
      enum: ["active", "banned", "inactive"], 
      default: "active" 
    },
    lastLogin: Date,
    loginAttempts: { 
      type: Number, 
      default: 0 
    },
    lockUntil: Date,
    profileImage: String,
    preferences: {
      language: { type: String, enum: ["en", "ar"], default: "ar" },
      notifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },
    favorites: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product" 
    }],
  },
  { 
    timestamps: true, 
    versionKey: false,
    // Optimize for read performance
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ============================================
// INDEXES - Critical for Performance!
// ============================================

// Primary lookup indexes (unique)
userSchema.index({ email: 1 }, { unique: true, background: true });
userSchema.index({ phone: 1 }, { unique: true, background: true });

// Secondary indexes for common queries
userSchema.index({ role: 1, status: 1 }, { background: true });
userSchema.index({ status: 1 }, { background: true });
userSchema.index({ createdAt: -1 }, { background: true });

// Sparse indexes (only index documents that have these fields)
userSchema.index(
  { resetPasswordToken: 1 }, 
  { sparse: true, background: true, expireAfterSeconds: 3600 } // Auto-delete after 1 hour
);
userSchema.index(
  { resetPasswordCode: 1 }, 
  { sparse: true, background: true }
);

// ============================================
// MIDDLEWARE
// ============================================

// Optimize password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    // Using pre-generated salt is slightly faster
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

// ============================================
// METHODS
// ============================================

// Remove console.logs in production!
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Optimized token generation
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role, 
      legacyRole: this.legacyRole 
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// ============================================
// VIRTUALS
// ============================================

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ============================================
// STATICS (Optimized query methods)
// ============================================

// Fast existence check
userSchema.statics.emailExists = function (email) {
  return this.exists({ email: email.toLowerCase().trim() });
};

userSchema.statics.phoneExists = function (phone) {
  return this.exists({ phone: phone.trim() });
};

// Find by email with password (for login)
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() })
    .select('+password')
    .lean(false); // Need methods, so no lean
};

// Find active user by ID (common query)
userSchema.statics.findActiveById = function (id) {
  return this.findOne({ _id: id, status: 'active' })
    .populate('role', 'name permissions')
    .lean();
};

export default mongoose.model("User", userSchema);