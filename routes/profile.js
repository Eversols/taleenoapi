const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// Complete profile (all fields)
router.post('/complete-profile', authMiddleware, profileController.completeProfile);

// Location search
router.post('/search-locations', authMiddleware, profileController.searchLocations);

// Get profile
router.get('/profile', authMiddleware, profileController.getProfile);

module.exports = router;