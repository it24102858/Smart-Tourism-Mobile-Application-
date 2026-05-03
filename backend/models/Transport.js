const mongoose = require('mongoose');

const TransportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    serviceCompanyName: { type: String, default: '', trim: true },
    serviceCompanyPhone: { type: String, default: '', trim: true },
    pricePerDay: { type: Number, required: true, min: 0 },
    seatCount: { type: Number, required: true, min: 1 },
    acType: { type: String, enum: ['ac', 'non_ac'], default: 'ac' },
    description: { type: String, default: '', trim: true },
    availability: { type: Boolean, default: true },
    driverName: { type: String, required: true, trim: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);


module.exports = mongoose.model('Transport', TransportSchema);
