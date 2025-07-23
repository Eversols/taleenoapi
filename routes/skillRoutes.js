const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/',authMiddleware('admin'), skillController.create);
router.get('/', skillController.getAll);
router.put('/:id', skillController.update);
router.delete('/:id', skillController.remove);

module.exports = router;
