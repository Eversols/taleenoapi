const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');
const authMiddleware = require('../middleware/auth');
// Public route (no auth required)
router.get('/', countryController.getAll);

// Apply auth middleware to all following routes
router.use(authMiddleware);

// Regular authenticated user routes (no admin check)
router.post('/', countryController.create);
router.put('/:id', countryController.update);
router.delete('/:id', countryController.remove);

module.exports = router;