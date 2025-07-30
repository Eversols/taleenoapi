const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');

const auth = require('../middleware/auth');
router.get('/', levelController.getAll);

router.use(auth);
router.get('/:id', levelController.getOne);
router.post('/', levelController.create);
router.put('/:id', levelController.update);
router.delete('/:id', levelController.delete);

module.exports = router;
