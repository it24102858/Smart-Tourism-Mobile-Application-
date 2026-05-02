const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COMPONENTS } = require('../models/User');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const TransportBooking = require('../models/TransportBooking');

router.post('/register', async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim()?.toLowerCase();
    const password = req.body?.password;
    const requestedRole = req.body?.role;
    const requestedComponent = req.body?.adminComponent;
    const providedAdminRegisterKey = req.body?.adminRegisterKey;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const role = requestedRole === 'admin' ? 'admin' : 'user';
    const adminComponent = role === 'admin' ? requestedComponent : null;

    if (role === 'admin' && !COMPONENTS.includes(adminComponent)) {
      return res.status(400).json({ message: 'Valid admin component is required' });
    }

    if (role === 'admin') {
      const expectedAdminRegisterKey = process.env.ADMIN_REGISTER_KEY?.trim();
      if (!expectedAdminRegisterKey) {
        if (adminComponent !== 'tourist_places_explorer') {
          return res.status(403).json({ message: 'Admin self-registration is disabled' });
        }
      } else if (String(providedAdminRegisterKey || '').trim() !== expectedAdminRegisterKey) {
        return res.status(403).json({ message: 'Invalid admin registration key' });
      }
    }

    const user = new User({ name, email, password, role, adminComponent });
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email is already registered' });
    }
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: first?.message || 'Invalid registration data' });
    }
    res.status(400).json({ message: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const sysEmail = String(process.env.SYSTEM_ADMIN_EMAIL || 'sysadmin@tourism.app').trim().toLowerCase();
    const sysPassword = String(process.env.SYSTEM_ADMIN_PASSWORD || 'System@123').trim();
    if (email === sysEmail && String(password) === sysPassword) {
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: 'Server auth configuration is missing JWT_SECRET' });
      }
      const token = jwt.sign(
        { id: 'system_admin', role: 'system_admin', adminComponent: 'system_administrator' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        token,
        user: {
          id: 'system_admin',
          name: 'System Administrator',
          email: sysEmail,
          role: 'system_admin',
          adminComponent: 'system_administrator',
        },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let valid = await bcrypt.compare(password, user.password);

    if (!valid && user.password === password) {
      user.password = password;
      await user.save();
      valid = true;
    }

    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.blocked) {
      return res.status(403).json({
        message: user.blockedReason || 'Your account was removed by system administrator',
        blocked: true,
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server auth configuration is missing JWT_SECRET' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, adminComponent: user.adminComponent || null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        profilePhoto: user.profilePhoto || '',
        role: user.role,
        adminComponent: user.adminComponent || null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

router.post('/system-admin-login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const adminEmail = String(process.env.SYSTEM_ADMIN_EMAIL || 'sysadmin@tourism.app').trim().toLowerCase();
    const adminPassword = String(process.env.SYSTEM_ADMIN_PASSWORD || 'System@123').trim();

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ message: 'Invalid system admin credentials' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server auth configuration is missing JWT_SECRET' });
    }

    const token = jwt.sign(
      { id: 'system_admin', role: 'system_admin', adminComponent: 'system_administrator' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: 'system_admin',
        name: 'System Administrator',
        email: adminEmail,
        role: 'system_admin',
        adminComponent: 'system_administrator',
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'System admin login failed' });
  }
});

router.get('/components', (req, res) => {
  res.json({ components: COMPONENTS });
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load profile' });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body?.name === 'string') updates.name = req.body.name.trim();
    if (typeof req.body?.phone === 'string') updates.phone = req.body.phone.trim();
    if (typeof req.body?.address === 'string') updates.address = req.body.address.trim();
    if (typeof req.body?.profilePhoto === 'string') updates.profilePhoto = req.body.profilePhoto.trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update profile' });
  }
});

router.delete('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Booking.deleteMany({ userId: user._id });
    await TransportBooking.deleteMany({ userId: user._id });
    await user.deleteOne();

    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete account' });
  }
});

module.exports = router;
