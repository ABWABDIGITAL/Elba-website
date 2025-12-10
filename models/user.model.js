import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import validator from "validator";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "firstName is required"],
      trim: true,
      maxlength: 50,
      minlength: 3,
    },
    lastName:{ 
      type: String,
      required: [true, "firstName is required"],
      trim: true,
      maxlength: 50,
      minlength: 3,
    },
    profileName:{ 
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
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      maxlength: 100,
      select: false,
    },

    dateOfBirth: { type: Date, default: null },

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
    required: true,
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

    resetPasswordCode: {
      type: String,
      default: null,
      index: true,
    },
    resetPasswordToken: {
      type: String,
      default: null,
      index: true,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },

    passwordVerified: { type: Boolean, default: false },

    status: { type: String, enum: ["active","banned" ,"inactive"], default: "active" },

    lastLogin: { type: Date, default: null },

    loginAttempts: { type: Number, default: 0 },

    lockUntil: { type: Date, default: null },

    profileImage: { type: String, default: null },

    preferences: {
      language: { type: String, enum: ["en", "ar"], default: "ar" },
      notifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true, versionKey: false }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});
userSchema.methods.comparePassword = async function (candidatePassword) {
  console.log('Comparing passwords...');
  console.log('Stored hash:', this.password);
  console.log('Provided password:', candidatePassword);
  
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  console.log('Bcrypt compare result:', isMatch);
  
  return isMatch;
};

userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, legacyRole: this.legacyRole },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export default mongoose.model("User", userSchema);
