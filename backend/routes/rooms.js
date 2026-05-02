const router = require('express').Router();
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const auth = require('../middleware/auth');
const { isHotelAdmin } = require('../utils/access');

const RESERVED_STATUSES = ['paid', 'approved'];

const withLiveBookedNow = async (rooms) => {
  const list = Array.isArray(rooms) ? rooms : [rooms];
  if (list.length === 0) return list;

  const now = new Date();
  const roomIds = list.map(r => r._id);

  const activeBookings = await Booking.find({
    roomId: { $in: roomIds },
    status: { $in: RESERVED_STATUSES },
    checkIn: { $lte: now },
    checkOut: { $gt: now },
  }).select('roomId');

  const bookedSet = new Set(activeBookings.map(b => String(b.roomId)));
  return list.map(r => {
    const raw = typeof r.toObject === 'function' ? r.toObject() : r;
    return {
      ...raw,
      // Respect the exact status set by admin edit/create.
      isBookedNow: Boolean(raw.isBookedNow),
    };
  });
};

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.hotelId) filter.hotelId = req.query.hotelId;
    const rooms = await Room.find(filter);
    const payload = await withLiveBookedNow(rooms);
    res.json(payload);
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
    const rooms = await Room.find({ hotelId: { $in: hotelIds } });
    const payload = await withLiveBookedNow(rooms);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const [payload] = await withLiveBookedNow([room]);
    res.json(payload);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'Only hotel admins can create rooms' });
    }
    const targetHotel = await Hotel.findById(req.body?.hotelId).select('ownerId');
    if (!targetHotel || String(targetHotel.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only create rooms for your own hotels' });
    }
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'Only hotel admins can update rooms' });
    }
    const existing = await Room.findById(req.params.id).select('hotelId');
    if (!existing) return res.status(404).json({ message: 'Room not found' });
    const ownerHotel = await Hotel.findById(existing.hotelId).select('ownerId');
    if (!ownerHotel || String(ownerHotel.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only update rooms in your own hotels' });
    }
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'Only hotel admins can delete rooms' });
    }
    const existing = await Room.findById(req.params.id).select('hotelId');
    if (!existing) return res.status(404).json({ message: 'Room not found' });
    const ownerHotel = await Hotel.findById(existing.hotelId).select('ownerId');
    if (!ownerHotel || String(ownerHotel.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete rooms in your own hotels' });
    }
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
