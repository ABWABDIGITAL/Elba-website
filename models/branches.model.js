import mongoose from "mongoose";
const WorkingHoursSchema = new mongoose.Schema({
  open: { type: String, required: true },   
  close: { type: String, required: true },  
  isClosed: { type: Boolean, default: false }
}, { _id: false });

const BranchSchema = new mongoose.Schema({
  name_ar: { type: String, required: true },
  name_en: { type: String, required: true },

  region: { 
    type: String, 
    required: true,
    enum: [
      'Riyadh', 
      'Makkah', 
      'Madinah', 
      'Eastern', 
      'Qassim', 
      'Asir', 
      'Tabuk', 
      'Hail',
      'Jizan',
      'Najran',
      'Baha',
      'Jouf',
      'Northern'
    ]
  },

  city: { type: String, required: true },

  address: { type: String, required: true },

  phones: [{ type: String }],

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  workingHours: {
    sat: { type: WorkingHoursSchema, required: true },
    sun: { type: WorkingHoursSchema, required: true },
    mon: { type: WorkingHoursSchema, required: true },
    tue: { type: WorkingHoursSchema, required: true },
    wed: { type: WorkingHoursSchema, required: true },
    thu: { type: WorkingHoursSchema, required: true },
    fri: { type: WorkingHoursSchema, required: true }
  },

  services: { type: [String], default: [] },

  isActive: { type: Boolean, default: true }

}, { timestamps: true });

BranchSchema.index({ location: '2dsphere' });
BranchSchema.index({ region: 1, city: 1, isActive: 1 });

export default mongoose.model('Branch', BranchSchema);