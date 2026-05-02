const router = require('express').Router();
const Hotel = require('../models/Hotel');
const auth = require('../middleware/auth');
const { isHotelAdmin } = require('../utils/access');

router.get('/', async (req, res) => {
  try {
    const hotels = await Hotel.find();
    res.json(hotels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine', auth, async (req, res) => {
  try {
    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'No access to hotel admin module' });
    }

    const hotels = await Hotel.find({ ownerId: req.user.id });
    res.json(hotels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'Only hotel admins can create hotels' });
    }

    if (req.user.role === 'owner') {
      const ownerHotelCount = await Hotel.countDocuments({ ownerId: req.user.id });
      if (ownerHotelCount >= 3) {
        return res.status(400).json({ message: 'Owner can add up to 3 hotels only' });
      }
    }

    const hotel = new Hotel({ ...req.body, ownerId: req.user.id });
    await hotel.save();
    res.status(201).json(hotel);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    const isAdmin = isHotelAdmin(req.user);
    const isOwner = String(hotel.ownerId) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You can only edit your own hotel' });
    }

    Object.assign(hotel, req.body);
    await hotel.save();
    res.json(hotel);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    const isAdmin = isHotelAdmin(req.user);
    const isOwner = String(hotel.ownerId) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You can only delete your own hotel' });
    }

    await hotel.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
