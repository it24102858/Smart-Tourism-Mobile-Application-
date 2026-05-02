const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Review = require('../models/Review');

const ensureSystemAdmin = (req, res, next) => {
  if (req.user?.role !== 'system_admin') return res.status(403).json({ message: 'System admin access required' });
  next();
};

router.get('/system-admin/users', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load users' });
  }
});

router.patch('/system-admin/users/:id/remove', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'Removal reason is required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.blocked = true;
    user.blockedReason = reason;
    await user.save();
    res.json({ message: 'User removed from platform access' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to remove user' });
  }
});

router.patch('/system-admin/users/:id/restore', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.blocked = false;
    user.blockedReason = '';
    await user.save();
    res.json({ message: 'User restored' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to restore user' });
  }
});

router.get('/system-admin/reviews', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load reviews' });
  }
});

router.patch('/system-admin/reviews/:id/moderate', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const status = String(req.body?.status || '');
    const reason = String(req.body?.reason || '').trim();
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid moderation status' });
    }
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.moderationStatus = status;
    review.moderationReason = reason;
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to moderate review' });
  }
});

router.delete('/system-admin/reviews/:id', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to delete review' });
  }
});

router.get('/system-admin/reports', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const reviews = await Review.find({ 'reports.0': { $exists: true } }).populate('userId', 'name email').sort({ updatedAt: -1 });
    const reports = [];
    reviews.forEach(review => {
      (review.reports || []).forEach(report => {
        reports.push({
          reviewId: review._id,
          reportId: report._id,
          reviewOwner: review.userId,
          moduleType: review.moduleType,
          entityId: review.entityId || review.placeId,
          comment: review.comment,
          rating: review.rating,
          reason: report.reason,
          status: report.status,
          createdAt: report.createdAt,
        });
      });
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load reports' });
  }
});

router.patch('/system-admin/reports/:reviewId/:reportId/resolve', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    const report = (review.reports || []).find(r => String(r._id) === String(req.params.reportId));
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.status = 'resolved';
    await review.save();
    res.json({ message: 'Report resolved' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to resolve report' });
  }
});

router.get('/system-admin/ratings-summary', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const grouped = await Review.aggregate([
      { $match: { moderationStatus: 'approved' } },
      { $group: { _id: '$moduleType', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const summary = { hotel: { averageRating: 0, count: 0 }, transport: { averageRating: 0, count: 0 }, place: { averageRating: 0, count: 0 } };
    grouped.forEach(g => {
      if (summary[g._id]) summary[g._id] = { averageRating: Number(g.averageRating || 0).toFixed(2), count: g.count };
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load ratings summary' });
  }
});

router.post('/system-admin/badges/recalculate', auth, ensureSystemAdmin, async (req, res) => {
  try {
    const topUsers = await Review.aggregate([
      { $match: { moderationStatus: 'approved' } },
      { $group: { _id: '$userId', totalReviews: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $match: { totalReviews: { $gte: 3 }, avgRating: { $gte: 4 } } },
    ]);

    const topIds = topUsers.map(x => x._id);
    await User.updateMany({}, { $set: { reviewBadge: '' } });
    if (topIds.length) await User.updateMany({ _id: { $in: topIds } }, { $set: { reviewBadge: 'top-reviewer' } });
    res.json({ message: 'Badges recalculated', topUsers: topIds.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to recalculate badges' });
  }
});

module.exports = router;

