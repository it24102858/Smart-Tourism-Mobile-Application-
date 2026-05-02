const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/transportController');

router.post('/transport', auth, controller.createVehicle);
router.get('/transport', controller.getVehicles);
router.put('/transport/:id', auth, controller.updateVehicle);
router.delete('/transport/:id', auth, controller.deleteVehicle);

router.post('/transport-bookings', auth, controller.createBooking);
router.get('/transport-bookings/user/:userId', auth, controller.getUserBookings);
router.get('/transport-bookings', auth, controller.getAllBookings);
router.put('/transport-bookings/:id', auth, controller.updateBooking);
router.put('/transport-bookings/:id/status', auth, controller.updateBookingStatus);
router.patch('/transport-bookings/:id/hide', auth, controller.hideBookingFromHistory);
router.delete('/transport-bookings/:id', auth, controller.cancelOrDeleteBooking);

module.exports = router;
