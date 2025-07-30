const express = require('express');
const router = express.Router();
const languageController = require('../controllers/languageController');
const authMiddleware = require('../middleware/auth');

// Public route (no auth required)
router.get('/', languageController.getAll);

// Admin-only routes
router.post('/', authMiddleware, languageController.create);
router.put('/:id', authMiddleware, languageController.update);
router.delete('/:id', authMiddleware, languageController.remove);

module.exports = router;