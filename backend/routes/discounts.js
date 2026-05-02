const router = require('express').Router();
const Discount = require('../models/Discount');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { isHotelAdmin } = require('../utils/access');

function validateDiscountDates(payload) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = payload.startDate ? new Date(payload.startDate) : null;
  const end = payload.endDate ? new Date(payload.endDate) : null;

  if (start && Number.isNaN(start.getTime())) return 'Invalid start date';
  if (end && Number.isNaN(end.getTime())) return 'Invalid end date';

  if (end && end < now) return 'End date cannot be in the past';
  if (start && end && end < start) return 'End date must be after start date';

  return null;
}

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.hotelId) filter.hotelId = req.query.hotelId;
    if (req.query.roomId) filter.roomId = req.query.roomId;
    const discounts = await Discount.find(filter);
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine', auth, async (req, res) => {
  try {
    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'No access to hotel admin module' });
    }

    const ownerHotels = await Hotel.find({ ownerId: req.user.id }).select('_id');
    const hotelIds = ownerHotels.map(h => h._id);
    const discounts = await Discount.find({ hotelId: { $in: hotelIds } });
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const dateError = validateDiscountDates(req.body || {});
    if (dateError) return res.status(400).json({ message: dateError });

    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'Only hotel admins can create discounts' });
    }

    if (!req.body?.hotelId) {
      return res.status(400).json({ message: 'You must select a hotel for discounts' });
    }
    if (req.body?.hotelId) {
      const hotel = await Hotel.findById(req.body.hotelId).select('ownerId');
      if (!hotel || String(hotel.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only create discounts for your own hotels' });
      }
    }
    if (req.body?.roomId) {
      const room = await Room.findById(req.body.roomId).select('hotelId');
      if (!room) return res.status(404).json({ message: 'Room not found' });
      const hotel = await Hotel.findById(room.hotelId).select('ownerId');
      if (!hotel || String(hotel.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only create discounts for your own rooms' });
      }
    }

    const discount = new Discount(req.body);
    await discount.save();
    res.status(201).json(discount);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const dateError = validateDiscountDates(req.body || {});
    if (dateError) return res.status(400).json({ message: dateError });

    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'Only hotel admins can update discounts' });
    }

    const existing = await Discount.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Discount not found' });

    const hotelIdToCheck = req.body?.hotelId || existing.hotelId;
    if (hotelIdToCheck) {
      const hotel = await Hotel.findById(hotelIdToCheck).select('ownerId');
      if (!hotel || String(hotel.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only update discounts for your own hotels' });
      }
    }

    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    res.json(discount);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'Only hotel admins can delete discounts' });
    }

    const existing = await Discount.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Discount not found' });
    if (existing.hotelId) {
      const hotel = await Hotel.findById(existing.hotelId).select('ownerId');
      if (!hotel || String(hotel.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only delete discounts for your own hotels' });
      }
    }

    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
