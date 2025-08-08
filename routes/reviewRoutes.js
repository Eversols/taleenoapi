const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');

router.use(auth);
router.post('/', reviewController.createReview);  // Fixed: reviewController.likeTalent
router.get('/:id', reviewController.getUserReviews);  // Fixed: reviewController.likeTalent


module.exports = router;

