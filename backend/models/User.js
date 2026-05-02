const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const COMPONENTS = [
  'trip_collaboration',
  'tourist_places_explorer',
  'transport_booking',
  'hotel_villa_booking',
  'map_navigation',
  'reviews_ratings',
];

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone:    { type: String, default: '' },
  address:  { type: String, default: '' },
  profilePhoto: { type: String, default: '' },
  role:     { type: String, enum: ['user', 'admin', 'owner'], default: 'user' },
  adminComponent: {
    type: String,
    enum: COMPONENTS,
    default: null,
  },
  blocked: { type: Boolean, default: false },
  blockedReason: { type: String, default: '', trim: true },
  reviewBadge: { type: String, enum: ['', 'top-reviewer'], default: '' },
}, { timestamps: true });
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', UserSchema);
module.exports.COMPONENTS = COMPONENTS;
