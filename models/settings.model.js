import mongoose from "mongoose";

const socialMediaSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ["facebook", "twitter", "instagram", "linkedin", "youtube"],
    required: true,
  },
  link: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    },
  },
});

// prevent duplicate platform entries
socialMediaSchema.index({ platform: 1 }, { unique: true });

const settingsSchema = new mongoose.Schema(
  {
    officialEmail: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      unique: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email format!`
      }
    },

    socialmediaLinks: [socialMediaSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Settings", settingsSchema);
