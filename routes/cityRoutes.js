const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const authMiddleware = require('../middleware/auth');


router.get('/', cityController.getAll);

router.use(authMiddleware);

router.post('/', cityController.create);
router.put('/:id', cityController.update);
router.delete('/:id', cityController.remove);
module.exports = router;

