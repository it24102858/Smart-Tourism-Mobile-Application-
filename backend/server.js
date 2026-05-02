const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const User = require('./models/User');

const app = express();

/* ========================
   MIDDLEWARE
======================== */
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

/* ========================
   DEMO USER SETUP
======================== */
async function ensureDemoUser() {
  const email = (process.env.DEMO_EMAIL || 'demo@tourism.app').trim().toLowerCase();
  const password = (process.env.DEMO_PASSWORD || 'Demo@123').trim();
  const name = (process.env.DEMO_NAME || 'Demo User').trim();

  const existing = await User.findOne({ email });

  if (!existing) {
    await new User({ name, email, password, role: 'admin', adminComponent: 'hotel_villa_booking' }).save();
    console.log(`Demo user created: ${email}`);
  } else {
    existing.name = name;
    existing.password = password;
    existing.role = 'admin';
    existing.adminComponent = 'hotel_villa_booking';
    await existing.save();
    console.log(`Demo user refreshed: ${email}`);
  }
}

/* ========================
   TEST ROUTE (IMPORTANT)
======================== */
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.get('/api', (req, res) => {
  res.json({ message: 'Smart Tourism API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

/* ========================
   API ROUTES
======================== */
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/transportRoutes'));
app.use('/api', require('./routes/placeRoutes'));
app.use('/api', require('./routes/systemAdminRoutes'));
app.use('/api', require('./routes/mapRoutes'));
app.use('/api', require('./routes/tripRoutes'));

app.use('/api', (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

/* ========================
   DATABASE + SERVER START
======================== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');

    ensureDemoUser().catch(err =>
      console.error('Demo user init failed:', err.message)
    );

    const PORT = process.env.PORT || 5000;

    // IMPORTANT FIX → 0.0.0.0 allows mobile access
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Accessible at: http://YOUR-IP:${PORT}`);
    });

  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  });
