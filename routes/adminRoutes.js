// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const talentController = require('../controllers/talentController');
const authController = require('../controllers/authController');
const feedController = require('../controllers/feedController');
const bookingController = require('../controllers/bookingController');
const skillController = require('../controllers/skillController');
const contactController = require('../controllers/contactController');
const languageController = require('../controllers/languageController');
const cityController = require('../controllers/cityController');


const isAdmin = require('../middleware/isAdmin');
const auth = require('../middleware/auth');

router.post('/register', adminController.register); // Requires authentication (optional)
router.post('/login', adminController.login);
router.post('/talent', auth , isAdmin ,talentController.getTalents);
router.post('/client', auth , isAdmin ,authController.getAllClients);
router.post('/detailsUser',auth , isAdmin , authController.detailsUser);
router.post('/feeds', auth , isAdmin ,feedController.AdminFeed);
router.post('/bookings',auth , isAdmin , bookingController.AdminBookings);
router.post('/dashboadTop5Bookings',auth , isAdmin , bookingController.dashboadTop5Bookings);
router.post('/dashboardTop5PaidBookings',auth , isAdmin , bookingController.dashboardTop5PaidBookings);
router.post('/bookingdetails',auth , isAdmin , auth , isAdmin , bookingController.AdminBookingDetails);
router.post('/updateUserStatus',auth , isAdmin , authController.updateUserStatus);
router.post('/softDeleteUser', auth , isAdmin ,authController.softDeleteUser);
router.post('/getDashboardCounts', auth , isAdmin ,authController.getDashboardCounts);
router.post('/updateAvailability', auth , isAdmin ,authController.updateAvailability);
router.post('/createAvailability', auth , isAdmin ,authController.createAvailability);
router.post('/unblockedandblocked', auth , isAdmin ,authController.unblockedandblocked);


// Protected routes — only logged-in users can create/update/delete
router.get('/skill-All', auth , isAdmin , skillController.adminAll);
router.post('/skill-create', auth , isAdmin , skillController.create);
router.put('/skill-update/:id', auth , isAdmin , skillController.update);
router.delete('/skill-remove/:id', auth , isAdmin , skillController.remove);
// contact
router.get('/contactList', auth , isAdmin , contactController.getAdminList);
router.delete("/contact/:id", auth , isAdmin , contactController.deleteContact);
// language
router.get('/language', languageController.admingetAll);
router.post('/language', auth , isAdmin , languageController.create);
router.put('/language/:id', auth , isAdmin , languageController.update);
router.delete('/language/:id', auth , isAdmin , languageController.remove);

// city
router.get('/city', auth , isAdmin , cityController.AdmingetAll);
router.post('/city', auth , isAdmin , cityController.create);
router.put('/city/:id', auth , isAdmin , cityController.update);
router.delete('/city/:id', auth , isAdmin , cityController.remove);

module.exports = router;
