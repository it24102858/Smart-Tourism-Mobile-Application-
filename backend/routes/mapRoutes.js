const router = require('express').Router();
const auth = require('../middleware/auth');
const TravelRoute = require('../models/TravelRoute');

const toRad = d => (d * Math.PI) / 180;
const haversineKm = (a, b) => {
  if (
    a?.lat == null || a?.lng == null ||
    b?.lat == null || b?.lng == null
  ) return 0;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const calculateDistanceKm = payload => {
  const points = [];
  if (payload.startLat != null && payload.startLng != null) {
    points.push({ lat: Number(payload.startLat), lng: Number(payload.startLng) });
  }
  (payload.stops || []).forEach(s => {
    if (s?.lat != null && s?.lng != null) points.push({ lat: Number(s.lat), lng: Number(s.lng) });
  });
  if (payload.endLat != null && payload.endLng != null) {
    points.push({ lat: Number(payload.endLat), lng: Number(payload.endLng) });
  }
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += haversineKm(points[i], points[i + 1]);
  }
  return Number(total.toFixed(2));
};

const tryParseLatLng = value => {
  const text = String(value || '').trim();
  const [a, b] = text.split(',');
  const lat = Number(a);
  const lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const getCoordsFromGoogleMapsLink = link => {
  const raw = String(link || '').trim();
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  // google maps directions style:
  // /maps/dir/?api=1&origin=6.90,79.85&destination=7.29,80.63
  const origin = url.searchParams.get('origin');
  const destination = url.searchParams.get('destination');
  const o = tryParseLatLng(origin);
  const d = tryParseLatLng(destination);
  if (o && d) return { origin: o, destination: d };

  // fallback: try to detect @lat,lng or /dir/lat,lng/lat,lng patterns
  const all = decodeURIComponent(raw);
  const pairRegex = /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/g;
  const pairs = [];
  let m;
  while ((m = pairRegex.exec(all)) !== null) {
    pairs.push({ lat: Number(m[1]), lng: Number(m[2]) });
  }
  if (pairs.length >= 2) {
    return { origin: pairs[0], destination: pairs[1] };
  }

  return null;
};

const calculateDistanceWithLinkFallback = payload => {
  const direct = calculateDistanceKm(payload);
  if (direct > 0) return direct;

  const parsed = getCoordsFromGoogleMapsLink(payload?.liveLocationLink);
  if (!parsed) return 0;

  return Number(haversineKm(parsed.origin, parsed.destination).toFixed(2));
};

const resolveDistanceKm = payload => {
  const manual = Number(payload?.distanceKm);
  if (Number.isFinite(manual) && manual > 0) return Number(manual.toFixed(2));
  return calculateDistanceWithLinkFallback(payload);
};

router.post('/map/routes', auth, async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Route title is required' });
    const payload = { ...req.body };
    payload.userId = req.user.id;
    payload.distanceKm = resolveDistanceKm(payload);
    const route = await TravelRoute.create(payload);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create route' });
  }
});

router.get('/map/routes', auth, async (req, res) => {
  try {
    const favoriteOnly = String(req.query?.favorite || '') === 'true';
    const historyOnly = String(req.query?.history || '') === 'true';
    const filter = { userId: req.user.id };
    if (favoriteOnly) filter.isFavorite = true;
    if (historyOnly) filter.isCompleted = true;
    const routes = await TravelRoute.find(filter).sort({ updatedAt: -1 });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load routes' });
  }
});

router.put('/map/routes/:id', auth, async (req, res) => {
  try {
    const route = await TravelRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (String(route.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Not allowed' });

    Object.assign(route, req.body || {});
    route.distanceKm = resolveDistanceKm(route);
    await route.save();
    res.json(route);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update route' });
  }
});

router.patch('/map/routes/:id/favorite', auth, async (req, res) => {
  try {
    const route = await TravelRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (String(route.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Not allowed' });
    route.isFavorite = !route.isFavorite;
    await route.save();
    res.json(route);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to toggle favorite' });
  }
});

router.patch('/map/routes/:id/complete', auth, async (req, res) => {
  try {
    const route = await TravelRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (String(route.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Not allowed' });
    route.isCompleted = true;
    await route.save();
    res.json(route);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to move route to history' });
  }
});

router.delete('/map/routes/:id', auth, async (req, res) => {
  try {
    const route = await TravelRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (String(route.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Not allowed' });
    await route.deleteOne();
    res.json({ message: 'Route deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to delete route' });
  }
});

module.exports = router;
