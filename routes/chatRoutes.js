const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');

// Public Routes
router.get('/', chatController.getAllChats);
router.get('/:id', chatController.getChatById);

// Protected Routes
router.post('/', authenticateToken, checkRole(['client', 'talent', 'admin']), chatController.createChat);
router.delete('/:id', authenticateToken, checkRole(['admin']), chatController.deleteChat);

module.exports = router;
