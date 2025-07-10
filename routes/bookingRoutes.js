const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController.js');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');

// Public Routes
router.get('/', bookingController.getAllBookings);
router.get('/:id', bookingController.getBookingById);

// Protected Routes
router.post('/', authenticateToken, checkRole(['client', 'admin']), bookingController.createBooking);
router.put('/:id', authenticateToken, checkRole(['client', 'admin']), bookingController.updateBooking);
router.delete('/:id', authenticateToken, checkRole(['admin']), bookingController.deleteBooking);

module.exports = router;
