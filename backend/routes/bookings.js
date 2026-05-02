const router = require('express').Router();
const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { isHotelAdmin } = require('../utils/access');

const RESERVED_STATUSES = ['paid', 'approved'];
const isOwnerOrAdmin = user => user?.role === 'owner' || isHotelAdmin(user);

router.get('/', auth, async (req, res) => {
  try {
    const filter = {};

    if (isOwnerOrAdmin(req.user)) {
      const ownerHotels = await Hotel.find({ ownerId: req.user.id }).select('_id');
      filter.hotelId = { $in: ownerHotels.map(h => h._id) };
    } else if (req.user.role === 'admin' && !isHotelAdmin(req.user)) {
      return res.status(403).json({ message: 'No access to hotel admin module' });
    }

    const bookings = await Booking.find(filter)
      .populate('hotelId')
      .populate('roomId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id, hiddenByUser: { $ne: true } })
      .populate('hotelId')
      .populate('roomId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      hotelId,
      roomId,
      checkIn,
      checkOut,
      fullName,
      email,
      phone,
      nationality,
      passportNumber,
      adults,
      children,
      numberOfRooms,
      roomType,
      bedPreference,
      smokingPreference,
      arrivalTime,
      specialNotes,
      promoCode,
      address,
      gender,
      paymentMethod,
    } = req.body || {};

    if (!roomId || !hotelId || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }
    if (!fullName || !email || !phone || !nationality || !passportNumber || !roomType) {
      return res.status(400).json({ message: 'Please fill all required guest and room details' });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (inDate >= outDate) return res.status(400).json({ message: 'Check-out must be after check-in' });

    const conflict = await Booking.findOne({
      roomId,
      status: { $in: RESERVED_STATUSES },
      checkIn: { $lt: outDate },
      checkOut: { $gt: inDate },
    });
    if (conflict) return res.status(409).json({ message: 'Room already paid/booked for these dates' });

    const method = paymentMethod === 'pay-at-hotel' ? 'pay-at-hotel' : 'demo-card';

    const booking = new Booking({
      userId: req.user.id,
      hotelId,
      roomId,
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      nationality: String(nationality).trim(),
      passportNumber: String(passportNumber).trim(),
      address: address || '',
      gender: gender || '',
      checkIn,
      checkOut,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      numberOfRooms: Number(numberOfRooms) || 1,
      roomType: String(roomType).trim(),
      bedPreference: bedPreference || '',
      smokingPreference: smokingPreference || '',
      arrivalTime: arrivalTime || '',
      specialNotes: specialNotes || '',
      promoCode: promoCode || '',
      status: 'saved',
      payment: {
        method,
        status: 'unpaid',
      },
    });
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/pay-demo', auth, async (req, res) => {
  try {
    const { cardNumber, expiry, cvv, name } = req.body || {};
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'saved') return res.status(400).json({ message: 'Only saved bookings can be paid' });

    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      roomId: booking.roomId,
      status: { $in: RESERVED_STATUSES },
      checkIn: { $lt: booking.checkOut },
      checkOut: { $gt: booking.checkIn },
    });
    if (conflict) {
      return res.status(409).json({ message: 'This date range was already booked by another paid booking' });
    }

    if (!/^\d{4} \d{4} \d{4} \d{4}$/.test(String(cardNumber || ''))) {
      return res.status(400).json({ message: 'Card number must be 16 digits in 4 by 4 format (1234 5678 9012 3456)' });
    }
    const number = String(cardNumber || '').replace(/\s+/g, '');
    if (!/^\d{3}$/.test(String(cvv || ''))) return res.status(400).json({ message: 'CVV must be 3 digits' });
    if (!/^\d{2}\/\d{2}$/.test(String(expiry || ''))) return res.status(400).json({ message: 'Expiry must be MM/YY' });
    if (!String(name || '').trim()) return res.status(400).json({ message: 'Card holder name is required' });

    const [mm, yy] = expiry.split('/').map(v => Number(v));
    if (mm < 1 || mm > 12) return res.status(400).json({ message: 'Invalid expiry month' });
    const exp = new Date(2000 + yy, mm, 0, 23, 59, 59, 999);
    if (exp < new Date()) return res.status(400).json({ message: 'Card is expired' });

    booking.status = 'paid';
    booking.payment = {
      method: 'demo-card',
      status: 'paid',
      paidAt: new Date(),
      last4: number.slice(-4),
    };
    await booking.save();

    res.json({ message: 'Payment successful', booking });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/owner-action', auth, async (req, res) => {
  try {
    if (!isOwnerOrAdmin(req.user)) return res.status(403).json({ message: 'Only owner/admin can do this action' });

    const { action } = req.body || {};
    if (!['approve', 'refund'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or refund' });
    }

    const booking = await Booking.findById(req.params.id).populate('hotelId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (String(booking.hotelId?.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your hotel booking' });
    }

    if (action === 'approve') {
      if (booking.status !== 'paid') return res.status(400).json({ message: 'Only paid bookings can be approved' });
      booking.status = 'approved';
      booking.payment.status = 'paid';
    }

    if (action === 'refund') {
      if (!['paid', 'approved'].includes(booking.status)) {
        return res.status(400).json({ message: 'Only paid/approved bookings can be refunded' });
      }
      booking.status = 'refunded';
      booking.payment.status = 'refunded';
    }

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await Booking.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Booking not found' });

    const privileged = isOwnerOrAdmin(req.user);
    const isSelf = String(existing.userId) === String(req.user.id);
    if (!privileged && !isSelf) return res.status(403).json({ message: 'Not allowed to update this booking' });

    if (req.body.status) return res.status(400).json({ message: 'Use status/action endpoints instead of direct status update' });
    if (!isSelf || existing.status !== 'saved') return res.status(400).json({ message: 'Only saved bookings can be edited by user' });

    const nextCheckIn = req.body.checkIn ? new Date(req.body.checkIn) : existing.checkIn;
    const nextCheckOut = req.body.checkOut ? new Date(req.body.checkOut) : existing.checkOut;
    if (nextCheckIn >= nextCheckOut) return res.status(400).json({ message: 'Check-out date must be after check-in date' });

    const conflict = await Booking.findOne({
      _id: { $ne: existing._id },
      roomId: existing.roomId,
      status: { $in: RESERVED_STATUSES },
      checkIn: { $lt: nextCheckOut },
      checkOut: { $gt: nextCheckIn },
    });
    if (conflict) return res.status(409).json({ message: 'Room already booked for these dates' });

    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await Booking.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Booking not found' });

    const privileged = isOwnerOrAdmin(req.user);
    const isSelf = String(existing.userId) === String(req.user.id);
    if (!privileged && !isSelf) return res.status(403).json({ message: 'Not allowed to delete this booking' });

    if (privileged && ['paid', 'approved'].includes(existing.status)) {
      return res.status(400).json({ message: 'Paid bookings cannot be deleted by owner/admin. Use refund.' });
    }
    if (isSelf && existing.status !== 'saved') {
      return res.status(400).json({ message: 'Only saved bookings can be deleted by user' });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (status !== 'cancelled') return res.status(400).json({ message: 'Only cancel is allowed here' });

    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'saved') return res.status(400).json({ message: 'Only saved bookings can be cancelled by user' });

    booking.status = 'cancelled';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/hide', auth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.hiddenByUser = true;
    await booking.save();
    res.json({ message: 'Booking removed from history' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
