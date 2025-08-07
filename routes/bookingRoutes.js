const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticate = require('../middleware/auth'); // assumes token middleware

router.post('/create', authenticate, bookingController.createBooking);
router.post('/', authenticate, bookingController.getBookings);
router.post('/getBookingDetails', authenticate,bookingController.getBookingDetails);
router.post('/update-status', authenticate,bookingController.updateBookingStatus);
module.exports = router;