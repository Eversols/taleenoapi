const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// ✅ These should all use real functions
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify/:code', authController.verifyEmail);

// ✅ Middleware should be a function, not undefined
router.get('/me', authMiddleware, authController.getMe);
router.put('/me', authMiddleware, authController.updateMe);

module.exports = router;
