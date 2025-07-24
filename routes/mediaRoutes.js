const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const auth = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(auth);
router.post('/upload', upload.single('file'), mediaController.upload);
router.get('/', mediaController.list);
router.put('/:id', mediaController.update);
router.delete('/:id', mediaController.remove);
router.post('/:id/like', mediaController.like);
router.post('/:id/share', mediaController.share);

module.exports = router;