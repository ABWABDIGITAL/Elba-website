import mongoose from "mongoose";
const emailPosterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
   
  },
  { timestamps: true }
);

const EmailPoster = mongoose.model("EmailPoster", emailPosterSchema);
export default EmailPoster;