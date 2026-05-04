const mongoose = require('mongoose');

const StopSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false }
);

const TravelRouteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    startName: { type: String, trim: true, default: '' },
    startLat: { type: Number, default: null },
    startLng: { type: Number, default: null },
    endName: { type: String, trim: true, default: '' },
    endLat: { type: Number, default: null },
    endLng: { type: Number, default: null },
    stops: [StopSchema],
    tripDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
    liveLocationLink: { type: String, trim: true, default: '' },
    distanceKm: { type: Number, default: 0 },
    isFavorite: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TravelRoute', TravelRouteSchema);
