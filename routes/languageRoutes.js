const express = require('express');
const router = express.Router();
const languageController = require('../controllers/languageController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', languageController.create);
router.get('/', languageController.getAll);
router.put('/:id', languageController.update);
router.delete('/:id', languageController.remove);

module.exports = router;
