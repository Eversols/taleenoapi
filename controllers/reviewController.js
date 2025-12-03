const { Booking, Talent, Client, User, Review, sequelize } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.createReview = async (req, res) => {
  try {
    const { booking_id, rating, comment } = req.body;
    const reviewer_id = req.user.id;
    const reviewer_role = req.user.role;

    // Find the booking
    const booking = await Booking.findByPk(booking_id);
    if (!booking) {
      return res.status(404).json(
        sendJson(false, 'Booking not found')
      );
    }

    let reviewed_id = null;
    let other_party_role = null;

    if (reviewer_role === 'client') {
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
      other_party_role = 'talent';
    } else if (reviewer_role === 'talent') {
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
      other_party_role = 'client';
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      where: {
        booking_id,
        reviewer_id
      }
    });
    
    if (existingReview) {
      return res.status(400).json(
        sendJson(false, 'You have already reviewed this booking')
      );
    }

    // Create the review
    const review = await Review.create({
      reviewer_id,
      reviewed_id,
      booking_id,
      rating,
      comment
    });

    // Check if the other party has already submitted a review
    const otherPartyReview = await Review.findOne({
      where: {
        booking_id,
        reviewer_id: reviewed_id // The other party's user_id as reviewer
      }
    });

    // Update booking status based on review conditions
    if (otherPartyReview) {
      // Both parties have reviewed - set to 'completed'
      booking.status = 'completed';
    } else {
      // Only one party has reviewed - set pending status for the other party
      if (reviewer_role === 'client') {
        booking.status = 'talentreviewpending';
      } else if (reviewer_role === 'talent') {
        booking.status = 'clientreviewpending';
      }
    }

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
        },
        booking_status: booking.status
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