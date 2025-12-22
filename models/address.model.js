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
  district: { type: String },
  street: { type: String, required: true },
  buildingNumber: { type: String },
  additionalNumber: { type: String },
  postalCode: { type: String, required: true },
  phoneNumber: { type: String },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

const Address = mongoose.model("Address", addressSchema);
export default Address;
