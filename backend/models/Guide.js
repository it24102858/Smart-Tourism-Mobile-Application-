const mongoose = require('mongoose'); 

const GuideSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    experience: { type: String, default: '', trim: true },
    contactNumber: { type: String, required: true, trim: true },
    languages: [{ type: String }],
    pricePerDay: { type: Number, required: true, min: 0 },
    availability: { type: Boolean, default: true },
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Guide', GuideSchema);
