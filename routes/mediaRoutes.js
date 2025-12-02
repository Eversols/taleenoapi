const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const auth = require('../middleware/auth');
const isAdminVerified = require('../middleware/isAdminVerified');
const multer = require('multer');

// ✅ Change from diskStorage to memoryStorage
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Optional: validate file types
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'application/pdf'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'));
    }
  }
});

router.use(auth);
router.get('/', mediaController.list);
router.post('/:id/like', mediaController.like);
router.post('/:id/share', mediaController.share);
router.use(isAdminVerified);
router.post('/upload', upload.single('file'), mediaController.upload);
router.put('/:id', upload.single('file'), mediaController.update);
router.post('/updateonlyImg', upload.single('file'), mediaController.updateonlyImg);
router.delete('/:id', mediaController.remove);

module.exports = router;