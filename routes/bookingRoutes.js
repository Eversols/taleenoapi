const express = require('express');
const {
  getBookings,
  getBooking,
  createBooking,
  updateBookingStatus,
  deleteBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(protect, getBookings)
  .post(protect, authorize('client'), createBooking);

router
  .route('/:id')
  .get(protect, getBooking)
  .delete(protect, deleteBooking);

router
  .route('/:id/status')
  .put(protect, authorize('talent', 'admin'), updateBookingStatus);

module.exports = router;