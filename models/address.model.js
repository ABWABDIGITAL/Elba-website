import mongoose from "mongoose";

const allowedCountries = ["Saudi Arabia"];
const allowedCities = [
  "Riyadh", "Jeddah", "Dammam", "Khobar", "Medina", "Makkah",
  "Qassim", "Tabuk", "Abha", "Jazan", "Hail", "Najran"
];

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  country: {
    type: String,
    enum: allowedCountries,
    default: "Saudi Arabia",
  },
  city: {
    type: String,
    enum: allowedCities,
    required: true,
  },
  district: { type: String, required: true },
  street: { type: String, required: true },
  buildingNumber: { type: String, required: true },
  additionalNumber: { type: String },
  postalCode: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

const Address = mongoose.model("Address", addressSchema);
export default Address;
