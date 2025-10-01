// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const talentController = require('../controllers/talentController');
const authController = require('../controllers/authController');
const feedController = require('../controllers/feedController');
const bookingController = require('../controllers/bookingController');
const skillController = require('../controllers/skillController');

const authMiddleware = require('../middleware/auth');

router.post('/register', adminController.register); // Requires authentication (optional)
router.post('/login', adminController.login);
router.post('/talent', talentController.getTalents);
router.post('/client', authController.getAllClients);
router.post('/detailsUser', authController.detailsUser);
router.post('/feeds', feedController.AdminFeed);
router.post('/bookings', bookingController.AdminBookings);
router.post('/bookingdetails', authMiddleware, bookingController.AdminBookingDetails);
router.post('/updateUserStatus', authController.updateUserStatus);
router.post('/softDeleteUser', authController.softDeleteUser);
router.post('/getDashboardCounts', authController.getDashboardCounts);


// Protected routes — only logged-in users can create/update/delete
router.get('/skill-All', authMiddleware, skillController.adminAll);
router.post('/skill-create', authMiddleware, skillController.create);
router.put('/skill-update/:id', authMiddleware, skillController.update);
router.delete('/skill-remove/:id', authMiddleware, skillController.remove);
module.exports = router;
