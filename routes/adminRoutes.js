// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const talentController = require('../controllers/talentController');
const authController = require('../controllers/authController');
const feedController = require('../controllers/feedController');
const authMiddleware = require('../middleware/auth');

router.post('/register', adminController.register); // Requires authentication (optional)
router.post('/login', adminController.login);
router.post('/talent', talentController.getTalents);
router.post('/client', authController.getAllClients);
router.post('/detailsUser', authController.detailsUser);
router.post('/feeds', feedController.AdminFeed);

module.exports = router;
