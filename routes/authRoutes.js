const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const path = require('path');
const crypto = require('crypto');

// ✅ Configure multer to save files with original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

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
router.post('/blockUser', authMiddleware, authController.blockUser);
router.post('/uploadProfileImage', authMiddleware, upload.single('profile_photo'), authController.uploadProfileImage);
router.delete("/delete/skills/:id", authMiddleware, authController.deleteSkill);
router.delete("/delete/interests/:id", authMiddleware, authController.deleteInterest);
router.post("/switchAccount", authMiddleware, authController.switchAccount);
router.post("/getBothProfiles", authMiddleware, authController.getBothProfiles);
module.exports = router;