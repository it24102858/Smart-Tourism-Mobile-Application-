const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', default: null },
    moduleType: { type: String, enum: ['place', 'hotel', 'transport'], default: 'place' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true },
    moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    moderationReason: { type: String, default: '', trim: true },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    votes: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value: { type: String, enum: ['helpful', 'not_helpful'] },
      },
    ],
    reports: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, trim: true, default: '' },
        status: { type: String, enum: ['open', 'resolved'], default: 'open' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', ReviewSchema);
