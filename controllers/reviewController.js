const { Review, User, Booking } = require('../models');

exports.createReview = async (req, res) => {
  try {
    const { reviewed_id, booking_id, rating, comment } = req.body;
    const reviewer_id = req.user.id; // from auth middleware

    const review = await Review.create({
      reviewer_id,
      reviewed_id,
      booking_id,
      rating,
      comment
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message
    });
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

    return res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};
