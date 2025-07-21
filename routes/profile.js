const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/complete-profile', authMiddleware, profileController.completeProfile);

module.exports = router;
