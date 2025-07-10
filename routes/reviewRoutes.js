const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');

// Public Routes
router.get('/', reviewController.getAllReviews);
router.get('/:id', reviewController.getReviewById);

// Protected Routes
router.post('/', authenticateToken, checkRole(['admin', 'client', 'talent']), reviewController.createReview);
router.put('/:id', authenticateToken, checkRole(['admin']), reviewController.updateReview);
router.delete('/:id', authenticateToken, checkRole(['admin']), reviewController.deleteReview);

module.exports = router;
