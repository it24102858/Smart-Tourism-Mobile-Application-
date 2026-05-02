const router = require('express').Router();
const auth = require('../middleware/auth');
const GroupTrip = require('../models/GroupTrip');
const User = require('../models/User');

const normalize = v => String(v || '').trim().toLowerCase();

const getAccess = (trip, user) => {
  const uid = String(user.id);
  const email = normalize(user.email);
  const isOwner = String(trip.ownerId) === uid;
  const member = (trip.members || []).find(m => (m.userId && String(m.userId) === uid) || normalize(m.email) === email);
  return { isOwner, member };
};

const canEdit = access => access.isOwner || access.member?.role === 'editor' || access.member?.role === 'owner';
const canView = access => access.isOwner || !!access.member;

router.post('/trips', auth, async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Trip title is required' });
    const me = await User.findById(req.user.id).select('name email');
    const trip = await GroupTrip.create({
      ownerId: req.user.id,
      title,
      destination: String(req.body?.destination || '').trim(),
      startDate: req.body?.startDate || null,
      endDate: req.body?.endDate || null,
      notes: String(req.body?.notes || '').trim(),
      budgetTotal: Number(req.body?.budgetTotal || 0),
      budgetUsed: Number(req.body?.budgetUsed || 0),
      members: [{ userId: req.user.id, name: me?.name || '', email: me?.email || '', role: 'owner' }],
      itinerary: [],
    });
    res.status(201).json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create trip' });
  }
});

router.get('/trips', auth, async (req, res) => {
  try {
    const email = normalize(req.user.email);
    const trips = await GroupTrip.find({
      $or: [{ ownerId: req.user.id }, { 'members.userId': req.user.id }, { 'members.email': email }],
    }).sort({ updatedAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load trips' });
  }
});

router.put('/trips/:id', auth, async (req, res) => {
  try {
    const trip = await GroupTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    const access = getAccess(trip, req.user);
    if (!canEdit(access)) return res.status(403).json({ message: 'Not allowed to edit this trip' });

    if (req.body?.title != null) trip.title = String(req.body.title).trim();
    if (req.body?.destination != null) trip.destination = String(req.body.destination).trim();
    if (req.body?.startDate != null) trip.startDate = req.body.startDate || null;
    if (req.body?.endDate != null) trip.endDate = req.body.endDate || null;
    if (req.body?.notes != null) trip.notes = String(req.body.notes || '').trim();
    if (req.body?.budgetTotal != null) trip.budgetTotal = Number(req.body.budgetTotal || 0);
    if (req.body?.budgetUsed != null) trip.budgetUsed = Number(req.body.budgetUsed || 0);
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update trip' });
  }
});

router.delete('/trips/:id', auth, async (req, res) => {
  try {
    const trip = await GroupTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    const access = getAccess(trip, req.user);
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can delete trip' });
    await trip.deleteOne();
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to delete trip' });
  }
});

router.post('/trips/:id/members', auth, async (req, res) => {
  try {
    const trip = await GroupTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    const access = getAccess(trip, req.user);
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can invite members' });

    const email = normalize(req.body?.email);
    if (!email) return res.status(400).json({ message: 'Member email is required' });
    const role = ['owner', 'editor', 'viewer'].includes(req.body?.role) ? req.body.role : 'viewer';
    if ((trip.members || []).some(m => normalize(m.email) === email)) {
      return res.status(409).json({ message: 'Member already invited' });
    }

    const user = await User.findOne({ email }).select('_id name email');
    trip.members.push({
      userId: user?._id || null,
      name: String(req.body?.name || user?.name || '').trim(),
      email,
      role,
    });
    await trip.save();
    res.status(201).json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to add member' });
  }
});

router.put('/trips/:id/members/:memberId', auth, async (req, res) => {
  try {
    const trip = await GroupTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    const access = getAccess(trip, req.user);
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can change member role' });

    const member = trip.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const role = String(req.body?.role || '');
    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid member role' });
    }
    member.role = role;
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update member role' });
  }
});

router.delete('/trips/:id/members/:memberId', auth, async (req, res) => {
  try {
    const trip = await GroupTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    const access = getAccess(trip, req.user);
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can remove member' });

    const member = trip.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.role === 'owner') return res.status(400).json({ message: 'Cannot remove owner member' });
    member.deleteOne();
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to remove member' });
  }
});

router.post('/trips/:id/itinerary', auth, async (req, res) => {
  try {
    const trip = await GroupTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    const access = getAccess(trip, req.user);
    if (!canEdit(access)) return res.status(403).json({ message: 'Not allowed to edit itinerary' });

    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Itinerary title is required' });
    trip.itinerary.push({
      title,
      date: req.body?.date || null,
      time: String(req.body?.time || '').trim(),
      note: String(req.body?.note || '').trim(),
      bookingRef: String(req.body?.bookingRef || '').trim(),
      isDone: false,
    });
    await trip.save();
    res.status(201).json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to add itinerary item' });
  }
});

router.put('/trips/:id/itinerary/:itemId', auth, async (req, res) => {
  try {
    const trip = await GroupTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    const access = getAccess(trip, req.user);
    if (!canEdit(access)) return res.status(403).json({ message: 'Not allowed to edit itinerary' });

    const item = trip.itinerary.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Itinerary item not found' });
    if (req.body?.title != null) item.title = String(req.body.title).trim();
    if (req.body?.date != null) item.date = req.body.date || null;
    if (req.body?.time != null) item.time = String(req.body.time || '').trim();
    if (req.body?.note != null) item.note = String(req.body.note || '').trim();
    if (req.body?.bookingRef != null) item.bookingRef = String(req.body.bookingRef || '').trim();
    if (req.body?.isDone != null) item.isDone = Boolean(req.body.isDone);
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update itinerary item' });
  }
});

router.delete('/trips/:id/itinerary/:itemId', auth, async (req, res) => {
  try {
    const trip = await GroupTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    const access = getAccess(trip, req.user);
    if (!canEdit(access)) return res.status(403).json({ message: 'Not allowed to delete itinerary item' });

    const item = trip.itinerary.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Itinerary item not found' });
    item.deleteOne();
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to delete itinerary item' });
  }
});

module.exports = router;
