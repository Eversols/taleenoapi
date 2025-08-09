const { Review, User, Booking } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.createReview = async (req, res) => {
  try {
    const { reviewed_id, booking_id, rating, comment } = req.body;
    const reviewer_id = req.user.id;

    const review = await Review.create({
      reviewer_id,
      reviewed_id,
      booking_id,
      rating,
      comment
    });

    return res.status(201).json(
      sendJson(true, 'Review submitted successfully', {
        review: {
          id: review.id,
          reviewer_id: review.reviewer_id,
          reviewed_id: review.reviewed_id,
          booking_id: review.booking_id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt
        }
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Failed to submit review', {
        error: error.message
      })
    );
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.params.id;

    const reviews = await Review.findAll({
      where: { reviewed_id: userId },
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'username'] },
        { model: Booking, as: 'booking', attributes: ['id', 'note'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json(
      sendJson(true, 'Reviews retrieved successfully', {
        count: reviews.length,
        reviews: reviews.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          reviewer: review.reviewer,
          booking: review.booking
        }))
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch reviews', {
        error: error.message
      })
    );
  }
};