const mongoose = require('mongoose');

const TransportBookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transport', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    pickupLocation: { type: String, default: '', trim: true },
    pickupMapLink: { type: String, default: '', trim: true },
    hiddenByUser: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TransportBooking', TransportBookingSchema);
