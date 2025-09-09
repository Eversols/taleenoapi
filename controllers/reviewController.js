const { Booking, Talent, Client, User, Review, sequelize } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.createReview = async (req, res) => {
  try {
    const { booking_id, rating, comment } = req.body;
    const reviewer_id = req.user.id;

    const booking = await Booking.findByPk(booking_id);
    let reviewed_id = null;
    if (req?.user?.role === 'client') {
      // fetch user_id from talent table
      const [talent] = await sequelize.query(
        `SELECT u.id AS user_id 
        FROM talents t 
        JOIN users u ON u.id = t.user_id 
        WHERE t.id = :talent_id`,
        {
          replacements: { talent_id: booking?.talent_id },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      reviewed_id = talent?.user_id;
    } else if (req?.user?.role === 'talent') {
      // fetch user_id from client table
      const [client] = await sequelize.query(
        `SELECT u.id AS user_id 
         FROM clients c 
         JOIN users u ON u.id = c.user_id 
         WHERE c.id = :client_id`,
        {
          replacements: { client_id: booking?.client_id },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      reviewed_id = client?.user_id;
    }



    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    const existingReview = await Review.findOne({ where: { booking_id } });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking'
      });
    }
    const review = await Review.create({
      reviewer_id,
      reviewed_id,
      booking_id,
      rating,
      comment
    });
    booking.status = 'completed';
    await booking.save();
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