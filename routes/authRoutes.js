const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/verifyOTP', authController.verifyOTP);
router.post('/loginWithPhone', authController.loginWithPhone);
router.post('/verifyLoginOTP', authController.verifyLoginOTP);
router.post('/resendOTP', authController.resendOTP);

// Protected routes (require valid token)
router.post('/updateProfile', authMiddleware, authController.updateProfile);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');
// const authMiddleware = require('../middleware/auth');

// // ✅ These should all use real functions
// router.post('/register', authController.register);
// router.post('/login', authController.login);
// router.get('/verify/:code', authController.verifyEmail);

// // ✅ Middleware should be a function, not undefined
// router.get('/me', authMiddleware, authController.getMe);
// router.put('/me', authMiddleware, authController.updateMe);

// module.exports = router;
