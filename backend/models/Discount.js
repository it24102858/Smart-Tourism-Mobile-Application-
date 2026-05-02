const mongoose = require('mongoose');
const DiscountSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  percentage: { type: Number, required: true },
  hotelId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  roomId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  startDate:  Date,
  endDate:    Date,
}, { timestamps: true });
module.exports = mongoose.model('Discount', DiscountSchema);