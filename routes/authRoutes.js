const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');

// ✅ Use memoryStorage for S3 uploads
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 5MB limit for profile images
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    // const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    // console.log("Uploaded file extension = " + file.mimetype);
    // if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    // } else {
    //   cb(new Error('Invalid file type. Only JPEG, PNG, and GIF images are allowed.'));
    // }
  }
});

// Public routes
router.post('/register', authController.register);
router.post('/verifyOTP', authController.verifyOTP);
router.post('/loginWithPhone', authController.loginWithPhone);
router.post('/verifyLoginOTP', authController.verifyLoginOTP);
router.post('/resendOTP', authController.resendOTP);

// Protected routes (require valid token)
router.post('/updateProfile', authMiddleware, upload.single('profile_photo'), authController.updateProfile);
router.post('/updateTalentDetails', authMiddleware, authController.updateTalentDetails);
router.post('/Setnotificationalert', authMiddleware, authController.Setnotificationalert);
router.get('/me', authMiddleware, authController.getMe);
router.post('/deleteUser', authMiddleware, authController.deleteUser);
router.post('/blockUser', authMiddleware, authController.blockUser);
router.post('/uploadProfileImage', authMiddleware, upload.single('profile_photo'), authController.uploadProfileImage);
router.delete("/delete/skills/:id", authMiddleware, authController.deleteSkill);
router.delete("/delete/interests/:id", authMiddleware, authController.deleteInterest);
router.post("/switchAccount", authMiddleware, authController.switchAccount);
router.post("/getBothProfiles", authController.getBothProfiles);

module.exports = router;