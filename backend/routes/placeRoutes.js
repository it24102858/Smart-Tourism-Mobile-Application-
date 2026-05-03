const router = require('express').Router();
const mongoose = require('mongoose');
const Place = require('../models/Place');
const Guide = require('../models/Guide');
const GuideBooking = require('../models/GuideBooking');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const TransportBooking = require('../models/TransportBooking');
const auth = require('../middleware/auth');
const { isPlacesAdmin } = require('../utils/access');

const isSameDay = (a, b) => {
  const ad = new Date(a);
  const bd = new Date(b);
  return ad.getFullYear() === bd.getFullYear() && ad.getMonth() === bd.getMonth() && ad.getDate() === bd.getDate();
};

router.get('/places', async (req, res) => {
  try {
    const q = String(req.query?.q || '').trim();
    const category = String(req.query?.category || '').trim();
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) filter.category = { $regex: `^${category}$`, $options: 'i' };

    const places = await Place.find(filter).sort({ createdAt: -1 });
    res.json(places);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load places' });
  }
});

router.get('/places/:id', async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found' });
    const guides = await Guide.find({ placeId: place._id, availability: true }).sort({ createdAt: -1 });
    const reviews = await Review.find({ placeId: place._id, moderationStatus: 'approved' }).populate('userId', 'name').sort({ createdAt: -1 });
    const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length) : 0;
    res.json({ place, guides, reviews, avgRating });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to load place details' });
  }
});

router.post('/places', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can create places' });
    const place = await Place.create(req.body);
    res.status(201).json(place);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create place' });
  }
});

router.put('/places/:id', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can update places' });
    const place = await Place.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!place) return res.status(404).json({ message: 'Place not found' });
    res.json(place);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update place' });
  }
});

router.delete('/places/:id', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can delete places' });
    const place = await Place.findByIdAndDelete(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found' });
    await Guide.deleteMany({ placeId: req.params.id });
    await GuideBooking.deleteMany({ placeId: req.params.id });
    await Review.deleteMany({ placeId: req.params.id });
    res.json({ message: 'Place deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to delete place' });
  }
});

router.get('/guides', async (req, res) => {
  try {
    const placeId = String(req.query?.placeId || '').trim();
    const filter = {};
    if (placeId) filter.placeId = placeId;
    const guides = await Guide.find(filter).populate('placeId', 'name').sort({ createdAt: -1 });
    res.json(guides);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load guides' });
  }
});

router.post('/guides', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can create guides' });
    const payload = { ...req.body };
    if (typeof payload.languages === 'string') {
      payload.languages = payload.languages.split(',').map(x => x.trim()).filter(Boolean);
    }
    const guide = await Guide.create(payload);
    res.status(201).json(guide);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create guide' });
  }
});

router.put('/guides/:id', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can update guides' });
    const payload = { ...req.body };
    if (typeof payload.languages === 'string') {
      payload.languages = payload.languages.split(',').map(x => x.trim()).filter(Boolean);
    }
    const guide = await Guide.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!guide) return res.status(404).json({ message: 'Guide not found' });
    res.json(guide);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update guide' });
  }
});

router.delete('/guides/:id', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can delete guides' });
    const guide = await Guide.findByIdAndDelete(req.params.id);
    if (!guide) return res.status(404).json({ message: 'Guide not found' });
    await GuideBooking.deleteMany({ guideId: req.params.id });
    res.json({ message: 'Guide deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to delete guide' });
  }
});

router.post('/guide-bookings', auth, async (req, res) => {
  try {
    const { guideId, placeId, date, paymentMethod, contactName, contactPhone, contactEmail } = req.body || {};
    if (!guideId || !placeId || !date) {
      return res.status(400).json({ message: 'guideId, placeId and date are required' });
    }
    if (!String(contactName || '').trim() || !String(contactPhone || '').trim() || !String(contactEmail || '').trim()) {
      return res.status(400).json({ message: 'Contact name, phone, and email are required' });
    }
    const guide = await Guide.findById(guideId);
    if (!guide) return res.status(404).json({ message: 'Guide not found' });
    if (!guide.availability) return res.status(400).json({ message: 'Guide is unavailable' });
    if (String(guide.placeId) !== String(placeId)) return res.status(400).json({ message: 'Guide is not assigned to this place' });

    const conflict = await GuideBooking.find({ guideId, status: { $in: ['pending', 'approved'] } });
    if (conflict.some(b => isSameDay(b.date, date))) {
      return res.status(409).json({ message: 'Guide already booked for this date' });
    }

    const method = String(paymentMethod || 'cash');
    if (!['cash', 'card'].includes(method)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const booking = await GuideBooking.create({
      userId: req.user.id,
      guideId,
      placeId,
      date,
      status: 'pending',
      paymentMethod: method,
      paymentStatus: method === 'cash' ? 'pending' : 'paid',
      amount: Number(guide.pricePerDay || 0),
      contactName: String(contactName).trim(),
      contactPhone: String(contactPhone).trim(),
      contactEmail: String(contactEmail).trim().toLowerCase(),
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create booking' });
  }
});

router.get('/guide-bookings/my', auth, async (req, res) => {
  try {
    const bookings = await GuideBooking.find({ userId: req.user.id })
      .populate('guideId')
      .populate('placeId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load my bookings' });
  }
});


router.put('/guide-bookings/:id', auth, async (req, res) => {
  try {
    const booking = await GuideBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const isOwner = String(booking.userId) === String(req.user.id);
    if (!isOwner) return res.status(403).json({ message: 'Not allowed to update this booking' });

    if (req.body?.date) {
      const conflict = await GuideBooking.find({
        _id: { $ne: booking._id },
        guideId: booking.guideId,
        status: { $in: ['pending', 'approved'] },
      });
      if (conflict.some(b => isSameDay(b.date, req.body.date))) {
        return res.status(409).json({ message: 'Guide already booked for this date' });
      }
      booking.date = req.body.date;
    }
    if (req.body?.paymentMethod) {
      const method = String(req.body.paymentMethod);
      if (!['cash', 'card'].includes(method)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      booking.paymentMethod = method;
      booking.paymentStatus = method === 'cash' ? 'pending' : 'paid';
    }
    booking.status = 'pending';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update booking' });
  }
});

router.delete('/guide-bookings/:id', auth, async (req, res) => {
  try {
    const booking = await GuideBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const isOwner = String(booking.userId) === String(req.user.id);
    const isAdmin = isPlacesAdmin(req.user);
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not allowed to delete this booking' });
    await booking.deleteOne();
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to delete booking' });
  }
});

router.get('/guide-bookings', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can view all bookings' });
    const bookings = await GuideBooking.find()
      .populate('userId', 'name email')
      .populate('guideId')
      .populate('placeId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load bookings' });
  }
});

router.put('/guide-bookings/:id/status', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can update booking status' });
    const { status } = req.body || {};
    if (!['approved', 'rejected', 'cancelled', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const booking = await GuideBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    booking.status = status;
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update booking status' });
  }
});

router.get('/reviews/place/:placeId', async (req, res) => {
  try {
    const reviews = await Review.find({ placeId: req.params.placeId, moderationStatus: 'approved' }).populate('userId', 'name').sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load reviews' });
  }
});

router.get('/reviews/module', async (req, res) => {
  try {
    const moduleType = String(req.query?.moduleType || '').trim();
    const entityId = String(req.query?.entityId || '').trim();
    if (!moduleType || !entityId) {
      return res.status(400).json({ message: 'moduleType and entityId are required' });
    }
    const reviews = await Review.find({
      moduleType,
      entityId,
      moderationStatus: 'approved',
    })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    const averageRating = reviews.length
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
      : 0;
    const helpful = reviews.reduce((sum, r) => sum + Number(r.helpfulCount || 0), 0);
    const notHelpful = reviews.reduce((sum, r) => sum + Number(r.notHelpfulCount || 0), 0);
    const trustScore = Math.min(100, Math.round((averageRating / 5) * 80 + Math.min(reviews.length, 20)));
    res.json({ reviews, averageRating, reviewCount: reviews.length, helpful, notHelpful, trustScore });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load module reviews' });
  }
});

router.get('/reviews/summary', async (req, res) => {
  try {
    const moduleType = String(req.query?.moduleType || '').trim();
    const ids = String(req.query?.entityIds || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
    if (!moduleType || !ids.length) {
      return res.status(400).json({ message: 'moduleType and entityIds are required' });
    }
    const objectIds = ids
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    const rows = await Review.aggregate([
      { $match: { moduleType, entityId: { $in: objectIds }, moderationStatus: 'approved' } },
      {
        $group: {
          _id: '$entityId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
          helpful: { $sum: '$helpfulCount' },
          notHelpful: { $sum: '$notHelpfulCount' },
        },
      },
    ]);

    const summary = {};
    ids.forEach(id => {
      summary[id] = { averageRating: 0, reviewCount: 0, helpful: 0, notHelpful: 0, trustScore: 0 };
    });
    rows.forEach(r => {
      const avg = Number(r.averageRating || 0);
      const key = String(r._id);
      summary[key] = {
        averageRating: avg,
        reviewCount: Number(r.reviewCount || 0),
        helpful: Number(r.helpful || 0),
        notHelpful: Number(r.notHelpful || 0),
        trustScore: Math.min(100, Math.round((avg / 5) * 80 + Math.min(Number(r.reviewCount || 0), 20))),
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load reviews summary' });
  }
});

router.post('/reviews', auth, async (req, res) => {
  try {
    const { placeId, moduleType, entityId, rating, comment } = req.body || {};
    const module = String(moduleType || (placeId ? 'place' : '')).trim();
    if (!module || !rating) return res.status(400).json({ message: 'moduleType and rating are required' });

    let targetId = entityId;
    if (module === 'place') targetId = placeId || entityId;
    if (!targetId) return res.status(400).json({ message: 'Target entity is required' });

    // Integrate with booking system: allow review only if user has relevant booking
    if (module === 'place') {
      const hasBooking = await GuideBooking.exists({ userId: req.user.id, placeId: targetId, status: { $in: ['approved', 'pending'] } });
      if (!hasBooking) return res.status(403).json({ message: 'You can review this place only after booking a guide' });
    }
    if (module === 'hotel') {
      const hasBooking = await Booking.exists({ userId: req.user.id, hotelId: targetId, status: { $in: ['paid', 'approved'] } });
      if (!hasBooking) return res.status(403).json({ message: 'You can review this hotel only after booking it' });
    }
    if (module === 'transport') {
      const hasBooking = await TransportBooking.exists({ userId: req.user.id, vehicleId: targetId, status: 'confirmed' });
      if (!hasBooking) return res.status(403).json({ message: 'You can review this transport only after confirmed booking' });
    }

    const review = await Review.create({
      userId: req.user.id,
      placeId: module === 'place' ? targetId : null,
      moduleType: module,
      entityId: targetId,
      rating: Number(rating),
      comment: String(comment || '').trim(),
      moderationStatus: 'approved',
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to add review' });
  }
});

router.put('/reviews/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    const isOwner = String(review.userId) === String(req.user.id);
    if (!isOwner) return res.status(403).json({ message: 'Not allowed to update review' });

    if (req.body?.rating != null) {
      const rating = Number(req.body.rating);
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      review.rating = rating;
    }
    if (req.body?.comment != null) {
      review.comment = String(req.body.comment || '').trim();
    }
    review.moderationStatus = 'pending';
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update review' });
  }
});

router.get('/reviews', auth, async (req, res) => {
  try {
    if (!isPlacesAdmin(req.user)) return res.status(403).json({ message: 'Only Tourist Places admins can view all reviews' });
    const reviews = await Review.find()
      .populate('userId', 'name')
      .populate('placeId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load reviews' });
  }
});

router.delete('/reviews/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    const isOwner = String(review.userId) === String(req.user.id);
    const isAdmin = isPlacesAdmin(req.user);
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not allowed to delete review' });
    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to delete review' });
  }
});

router.post('/reviews/:id/vote', auth, async (req, res) => {
  try {
    const value = String(req.body?.value || '');
    if (!['helpful', 'not_helpful'].includes(value)) return res.status(400).json({ message: 'Invalid vote value' });
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.votes = (review.votes || []).filter(v => String(v.userId) !== String(req.user.id));
    review.votes.push({ userId: req.user.id, value });
    review.helpfulCount = review.votes.filter(v => v.value === 'helpful').length;
    review.notHelpfulCount = review.votes.filter(v => v.value === 'not_helpful').length;
    await review.save();
    res.json({ helpfulCount: review.helpfulCount, notHelpfulCount: review.notHelpfulCount });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to vote review' });
  }
});

router.post('/reviews/:id/report', auth, async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'Report reason is required' });
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const already = (review.reports || []).some(r => String(r.userId) === String(req.user.id) && r.status === 'open');
    if (already) return res.status(409).json({ message: 'You already reported this review' });

    review.reports = review.reports || [];
    review.reports.push({ userId: req.user.id, reason, status: 'open' });
    await review.save();
    res.json({ message: 'Review reported' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to report review' });
  }
});

module.exports = router;
