import mongoose from "mongoose";

const WorkingHoursSchema = new mongoose.Schema({
  open: { type: String, required: true },
  close: { type: String, required: true },
  isClosed: { type: Boolean, default: false }
}, { _id: false });

const BranchSchema = new mongoose.Schema({
  // Arabic content
  ar: {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    region: { type: String, required: true },
    services: [{ type: String, trim: true }],
    description: { type: String },
  },

  // English content
  en: {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    region: { type: String, required: true },
    services: [{ type: String, trim: true }],
    description: { type: String },
  },

  // Shared fields (language-independent)
  regionCode: {
    type: String,
    required: true,
    index: true,
    enum: [
      'riyadh',
      'makkah',
      'madinah',
      'eastern',
      'qassim',
      'asir',
      'tabuk',
      'hail',
      'jizan',
      'najran',
      'baha',
      'jouf',
      'northern'
    ]
  },

  phones: [{ type: String, trim: true }],
  email: { type: String, trim: true },
  whatsapp: { type: String, trim: true },

  // Geospatial data
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates. Must be [longitude, latitude] with valid ranges.'
      }
    }
  },

  // Convenience fields for direct access
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },

  workingHours: {
    sat: { type: WorkingHoursSchema, required: true },
    sun: { type: WorkingHoursSchema, required: true },
    mon: { type: WorkingHoursSchema, required: true },
    tue: { type: WorkingHoursSchema, required: true },
    wed: { type: WorkingHoursSchema, required: true },
    thu: { type: WorkingHoursSchema, required: true },
    fri: { type: WorkingHoursSchema, required: true }
  },

  // Manager info
  manager: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  },

  // Branch features
  hasParking: { type: Boolean, default: false },
  hasDisabledAccess: { type: Boolean, default: false },
  hasCafeteria: { type: Boolean, default: false },
  hasShowroom: { type: Boolean, default: true },

  // Images
  images: [{
    url: { type: String, required: true },
    alt: { type: String },
  }],

  // Display order for featured branches
  displayOrder: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false, index: true },

  isActive: { type: Boolean, default: true, index: true }

}, { timestamps: true });

// Pre-save hook to sync coordinates with lat/long fields
BranchSchema.pre('save', function(next) {
  if (this.latitude && this.longitude) {
    this.location.coordinates = [this.longitude, this.latitude];
  } else if (this.location && this.location.coordinates && this.location.coordinates.length === 2) {
    this.longitude = this.location.coordinates[0];
    this.latitude = this.location.coordinates[1];
  }
  next();
});

// Indexes
BranchSchema.index({ location: '2dsphere' });
BranchSchema.index({ regionCode: 1, isActive: 1 });
BranchSchema.index({ 'ar.city': 1, isActive: 1 });
BranchSchema.index({ 'en.city': 1, isActive: 1 });
BranchSchema.index({ isFeatured: 1, displayOrder: 1 });

// Text search indexes for both languages
BranchSchema.index({
  'ar.name': 'text',
  'ar.address': 'text',
  'ar.city': 'text',
  'en.name': 'text',
  'en.address': 'text',
  'en.city': 'text',
});

// Static methods
BranchSchema.statics.findNearby = function(longitude, latitude, maxDistance = 50000, language = 'ar') {
  return this.find({
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    }
  }).select(`ar en phones location workingHours isFeatured`);
};

BranchSchema.statics.getByRegion = function(regionCode, language = 'ar') {
  return this.find({
    regionCode,
    isActive: true
  })
    .sort({ displayOrder: 1, [`${language}.name`]: 1 })
    .lean();
};

BranchSchema.statics.getFeatured = function(limit = 5) {
  return this.find({
    isFeatured: true,
    isActive: true
  })
    .sort({ displayOrder: 1 })
    .limit(limit)
    .lean();
};

// Instance methods
BranchSchema.methods.isOpenNow = function() {
  const now = new Date();
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = days[now.getDay()];
  const hours = this.workingHours[dayName];

  if (hours.isClosed) return false;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  return currentTime >= openTime && currentTime <= closeTime;
};

export default mongoose.model('Branch', BranchSchema);
