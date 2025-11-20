const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const auth = require('../middleware/auth');
const isAdminVerified = require('../middleware/isAdminVerified');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

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