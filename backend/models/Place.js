const mongoose = require('mongoose');

const PlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    category: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    images: [{ type: String }],
    openingHours: { type: String, default: '', trim: true },
    entryFee: { type: String, default: '', trim: true },
    contactNumber: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Place', PlaceSchema);
