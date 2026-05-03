const mongoose = require('mongoose');
const RoomSchema = new mongoose.Schema({
  hotelId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  roomNumber: { type: String, required: true, trim: true },
  type:     { type: String, required: true },
  price:    { type: Number, required: true },
  capacity: Number,
  description: { type: String, default: '' },
  images: { type: [String], default: [] },
  isBookedNow: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);
