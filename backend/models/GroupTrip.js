const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
  },
  { _id: true }
);


const ItineraryItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, default: null },
    time: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    bookingRef: { type: String, trim: true, default: '' },
    isDone: { type: Boolean, default: false },
  },
  { _id: true }
);

const GroupTripSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    destination: { type: String, trim: true, default: '' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
    budgetTotal: { type: Number, default: 0, min: 0 },
    budgetUsed: { type: Number, default: 0, min: 0 },
    members: [MemberSchema],
    itinerary: [ItineraryItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('GroupTrip', GroupTripSchema);
