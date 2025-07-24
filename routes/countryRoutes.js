const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.use(authMiddleware);
router.use(isAdmin);

router.post('/', countryController.create);
router.get('/', countryController.getAll);
router.put('/:id', countryController.update);
router.delete('/:id', countryController.remove);

module.exports = router;
