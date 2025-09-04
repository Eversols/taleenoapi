const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Public routes
router.post('/register', authController.register);
router.post('/verifyOTP', authController.verifyOTP);
router.post('/loginWithPhone', authController.loginWithPhone);
router.post('/verifyLoginOTP', authController.verifyLoginOTP);
router.post('/resendOTP', authController.resendOTP);

// Protected routes (require valid token)
router.post('/updateProfile', authMiddleware,upload.single('profile_photo'), authController.updateProfile);
router.post('/updateTalentDetails', authMiddleware, authController.updateTalentDetails);
router.post('/Setnotificationalert', authMiddleware, authController.Setnotificationalert);
router.get('/me', authMiddleware, authController.getMe);
router.post('/deleteUser', authMiddleware, authController.deleteUser);

module.exports = router;