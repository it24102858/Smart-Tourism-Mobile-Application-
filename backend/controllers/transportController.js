const Transport = require('../models/Transport');
const TransportBooking = require('../models/TransportBooking');
const { isTransportAdmin } = require('../utils/access');


const toDate = value => new Date(value);

const hasBookingConflict = async ({ vehicleId, startDate, endDate, excludeId = null }) => {
  const query = {
    vehicleId,
    status: { $in: ['pending', 'confirmed'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return TransportBooking.findOne(query);
};

exports.createVehicle = async (req, res) => {
  try {
    if (!isTransportAdmin(req.user)) {
      return res.status(403).json({ message: 'Only transport admins can add vehicles' });
    }
    const vehicle = await Transport.create(req.body);
    return res.status(201).json(vehicle);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.getVehicles = async (_req, res) => {
  try {
    const vehicles = await Transport.find().sort({ createdAt: -1 }).lean();
    const now = new Date();

    const vehicleIds = vehicles.map(v => v._id);
    const activeConfirmed = await TransportBooking.find({
      vehicleId: { $in: vehicleIds },
      status: 'confirmed',
      endDate: { $gte: now },
    })
      .sort({ startDate: 1 })
      .select('vehicleId startDate endDate');

    const activeMap = new Map(activeConfirmed.map(b => [String(b.vehicleId), b]));
    const withStatus = vehicles.map(v => {
      const active = activeMap.get(String(v._id));
      return {
        ...v,
        isBooked: !!active,
        bookingStatus: active ? 'booked' : 'available',
        activeBooking: active
          ? { startDate: active.startDate, endDate: active.endDate }
          : null,
      };
    });

    return res.json(withStatus);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    if (!isTransportAdmin(req.user)) {
      return res.status(403).json({ message: 'Only transport admins can update vehicles' });
    }
    const vehicle = await Transport.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    return res.json(vehicle);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    if (!isTransportAdmin(req.user)) {
      return res.status(403).json({ message: 'Only transport admins can delete vehicles' });
    }
    const inUse = await TransportBooking.findOne({
      vehicleId: req.params.id,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (inUse) {
      return res.status(400).json({ message: 'Cannot delete vehicle with active bookings' });
    }

    const vehicle = await Transport.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    return res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { vehicleId, startDate, endDate, pickupLocation, pickupMapLink } = req.body || {};
    if (!vehicleId || !startDate || !endDate) {
      return res.status(400).json({ message: 'vehicleId, startDate, and endDate are required' });
    }

    const start = toDate(startDate);
    const end = toDate(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    if (start >= end) {
      return res.status(400).json({ message: 'startDate must be before endDate' });
    }

    const vehicle = await Transport.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (!vehicle.availability) return res.status(400).json({ message: 'Vehicle is unavailable' });

    const conflict = await hasBookingConflict({ vehicleId, startDate: start, endDate: end });
    if (conflict) return res.status(409).json({ message: 'Vehicle already booked in this date range' });

    const booking = await TransportBooking.create({
      userId: req.user.id,
      vehicleId,
      startDate: start,
      endDate: end,
      pickupLocation: String(pickupLocation || '').trim(),
      pickupMapLink: String(pickupMapLink || '').trim(),
      status: 'pending',
    });
    return res.status(201).json(booking);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    if (String(requestedUserId) !== String(req.user.id) && !isTransportAdmin(req.user)) {
      return res.status(403).json({ message: 'Not allowed to view these bookings' });
    }

    const query = { userId: requestedUserId };
    if (String(requestedUserId) === String(req.user.id)) {
      query.hiddenByUser = { $ne: true };
    }

    const bookings = await TransportBooking.find(query)
      .populate('vehicleId')
      .sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    if (!isTransportAdmin(req.user)) {
      return res.status(403).json({ message: 'Only transport admins can view all bookings' });
    }
    const bookings = await TransportBooking.find()
      .populate('vehicleId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await TransportBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const isOwner = String(booking.userId) === String(req.user.id);
    if (!isOwner) return res.status(403).json({ message: 'Not allowed to update this booking' });

    const start = req.body.startDate ? toDate(req.body.startDate) : booking.startDate;
    const end = req.body.endDate ? toDate(req.body.endDate) : booking.endDate;
    if (start >= end) return res.status(400).json({ message: 'startDate must be before endDate' });

    const vehicle = await Transport.findById(booking.vehicleId);
    if (!vehicle || !vehicle.availability) return res.status(400).json({ message: 'Vehicle unavailable' });

    const conflict = await hasBookingConflict({
      vehicleId: booking.vehicleId,
      startDate: start,
      endDate: end,
      excludeId: booking._id,
    });
    if (conflict) return res.status(409).json({ message: 'Vehicle already booked in this date range' });

    booking.startDate = start;
    booking.endDate = end;
    if (typeof req.body?.pickupLocation === 'string') {
      booking.pickupLocation = req.body.pickupLocation.trim();
    }
    if (typeof req.body?.pickupMapLink === 'string') {
      booking.pickupMapLink = req.body.pickupMapLink.trim();
    }
    booking.status = 'pending';
    await booking.save();
    return res.json(booking);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.cancelOrDeleteBooking = async (req, res) => {
  try {
    const booking = await TransportBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = String(booking.userId) === String(req.user.id);
    if (isTransportAdmin(req.user)) {
      await booking.deleteOne();
      return res.json({ message: 'Booking deleted by admin' });
    }
    if (!isOwner) return res.status(403).json({ message: 'Not allowed to cancel this booking' });

    booking.status = 'cancelled';
    await booking.save();
    return res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    if (!isTransportAdmin(req.user)) {
      return res.status(403).json({ message: 'Only transport admins can update booking status' });
    }

    const { status } = req.body || {};
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await TransportBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    booking.status = status;
    await booking.save();
    return res.json(booking);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.hideBookingFromHistory = async (req, res) => {
  try {
    const booking = await TransportBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = String(booking.userId) === String(req.user.id);
    if (!isOwner) return res.status(403).json({ message: 'Not allowed to remove this booking from history' });

    booking.hiddenByUser = true;
    await booking.save();
    return res.json({ message: 'Booking removed from history' });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
