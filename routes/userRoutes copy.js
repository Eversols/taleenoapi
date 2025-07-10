const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');

// Public Routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Protected Routes
router.get('/protected', authenticateToken, userController.getProtectedData); // Example of a protected route

// Role-Based Protected Routes
router.get('/admin-only',authenticateToken,checkRole(['talent']),
    (req, res) => res.status(200).json({ message: 'Hello talent!' })
);

module.exports = router;
