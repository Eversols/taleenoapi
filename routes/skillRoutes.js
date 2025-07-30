const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const authMiddleware = require('../middleware/auth');

// Public route — no auth needed
router.get('/', skillController.getAll);

// Protected routes — only logged-in users can create/update/delete
router.post('/', authMiddleware, skillController.create);
router.put('/:id', authMiddleware, skillController.update);
router.delete('/:id', authMiddleware, skillController.remove);

module.exports = router;
