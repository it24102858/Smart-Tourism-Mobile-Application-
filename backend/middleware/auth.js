const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const allowDevBypass = process.env.ALLOW_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production';
  const hasBypassHeader = req.headers['x-dev-admin-bypass'] === 'true' || req.headers['x-dev-owner-bypass'] === 'true';

  if (allowDevBypass && hasBypassHeader) {
    req.user = {
      id: process.env.DEV_OWNER_ID || '000000000000000000000001',
      role: 'admin',
      adminComponent: 'hotel_villa_booking',
    };
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

