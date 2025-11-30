import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    resource: {
      type: String,
      required: true,
      enum: [
        "users",
        "products",
        "categories",
        "brands",
        "orders",
        "reviews",
        "coupons",
        "catalogs",
        "home",
        "branches",
        "cart",
        "analytics",
        "roles",
        "settings",
      ],
    },
    actions: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      index: true,
    },

    displayName: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },

    description: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },

    permissions: [permissionSchema],

    isSystemRole: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

roleSchema.index({ name: 1, isActive: 1 });

roleSchema.pre("findOneAndDelete", async function (next) {
  const role = await this.model.findOne(this.getQuery());

  if (role?.isSystemRole) {
    const error = new Error("Cannot delete system roles");
    error.statusCode = 403;
    return next(error);
  }

  next();
});

roleSchema.methods.hasPermission = function (resource, action) {
  const permission = this.permissions.find((p) => p.resource === resource);
  return permission ? permission.actions[action] === true : false;
};

roleSchema.methods.canAccessResource = function (resource) {
  const permission = this.permissions.find((p) => p.resource === resource);
  return permission
    ? Object.values(permission.actions).some((val) => val === true)
    : false;
};

export default mongoose.model("Role", roleSchema);
