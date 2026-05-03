const mongoose = require('mongoose');
const HotelSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  location:    { type: String, required: true },
  phone:       { type: String, default: '' },
  description: String,
  images:      [String],
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Hotel', HotelSchema);
