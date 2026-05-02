const mongoose = require('mongoose');

const GuideBookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    guideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', required: true },
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'approved', 'cancelled', 'rejected'], default: 'pending' },
    paymentMethod: { type: String, enum: ['cash', 'card'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    amount: { type: Number, default: 0, min: 0 },
    contactName: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GuideBooking', GuideBookingSchema);
