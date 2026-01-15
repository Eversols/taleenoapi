const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticate = require('../middleware/auth'); // assumes token middleware

router.post('/create', authenticate, bookingController.createBooking);
router.post('/', authenticate, bookingController.getBookings);
router.get('/clientrating', authenticate, bookingController.clientsBookings);
router.get('/ByDateBookings', authenticate, bookingController.ByDateBookings);
router.get('/MyBookingsForTalent', authenticate, bookingController.MyBookingsForTalent);

router.post('/getBookingDetails', authenticate,bookingController.getBookingDetails);
router.post('/update-status', authenticate,bookingController.updateBookingStatus);
router.get('/bookings-Slots-have-talent', authenticate,bookingController.MyBookingSlotsForTalent);
router.post('/MyBookingSlotsForClient', authenticate,bookingController.MyBookingSlotsForClient);
router.post('/bookingsSlotshaveclient', authenticate,bookingController.bookingsSlotshaveclient);
router.put("/reschedule", authenticate,bookingController.rescheduleBooking);
router.post("/checkout", authenticate,bookingController.createCheckout);
router.post("/TalentAvailability", authenticate,bookingController.TalentAvailability);
router.post("/TestNewAvailability", authenticate,bookingController.TestNewAvailability);
router.get("/status", authenticate,bookingController.getPaymentStatus);

router.put('/reschedule/approve/:id', authenticate, bookingController.approveReschedule);
router.put('/reschedule/reject/:id', authenticate, bookingController.rejectReschedule);
router.get("/pay", bookingController.pay);

router.get("/hyperpay/return", bookingController.hyperpayReturn);
router.get("/payment-success", bookingController.paymentSuccess);
router.get("/payment-failed", bookingController.paymentFailed);
router.get("/payment-error", bookingController.paymentError);
module.exports = router;