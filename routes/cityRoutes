const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.use(authMiddleware);
router.use(isAdmin);

router.post('/', cityController.create);
router.get('/', cityController.getAll);
router.put('/:id', cityController.update);
router.delete('/:id', cityController.remove);
module.exports = router;

