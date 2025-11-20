import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true , "Name is required"],
        trim: true,
        maxlength: [50 , "Name must be less than 50 characters"],
        minlength: [3 , "Name must be at least 3 characters"],
    },
    email: {
        type: String,
        required: [true , "Email is required"],
        validate: [ validator.isEmail , "Email is invalid" ],
        lowercase: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true , "Password is required"],
        maxlength: [50 , "Password must be less than 50 characters"],
        minlength: [6 , "Password must be at least 6 characters"],
        select: false,
    },
    role: {
        type: String,
        enum: ["user", "admin" , "manager"],
        default: "user",
    },
    resetPasswordCode: {
        type: String,
        default: null,
    },
    resetPasswordExpire: {
        type: Date,
        default: null,
    },
    passwordVerified: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    versionKey: false 
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateToken = function () {
    return jwt.sign({ id: this._id , role: this.role }, process.env.JWT_SECRET , { expiresIn: "1d" });
};


const User = mongoose.model("User", userSchema);

export default User;
