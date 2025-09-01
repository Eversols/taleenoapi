const { Booking, Client, Talent, User, Skill, Review } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { sendJson } = require('../utils/helpers');

const BookingStatusEnum = [
  'pending',
  'accepted',
  'inProgress',
  'completed',
  'reviewPending', // added for pending review state
  'reviewedAndCompleted',
  'requestedForRescheduleByUser',
  'requestedForRescheduleByTalent',
  'canceledByUser',
  'canceledByTalent',
];
// ✅ Define helper function OUTSIDE the try block
function parseAvailability(value) {
  if (!value) return null;

  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (e) {
    console.warn('Invalid availability format:', value);
    return null;
  }
}

exports.getBookings = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    const userId = req.user.id;
    const role = req.user.role;
    const searchDate = req.query.date || null; // Only YYYY-MM-DD, valid MySQL date
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = '';
    if (searchDate) {
      whereClause = `AND DATE(b.created_at) = :searchDate`;
    }
    let results = [];
    let totalCount = 0;

    if (role === "talent") {
      [results] = await sequelize.query(`
        SELECT 
          b.id AS booking_id,
          b.created_at,
          b.time_slot,
          b.status,
          b.note,
          
          c.id AS client_id,
          c.full_name AS client_full_name,
          c.profile_photo AS client_profile_photo,
          c.gender AS client_gender,
          c.country AS client_country,
          cc.name AS client_city,

          uc.id AS client_user_id,
          uc.username AS client_username,
          uc.email AS client_email,
          uc.phone_number AS client_phone_number,

          t.id AS talent_id,
          t.full_name AS talent_full_name,
          t.hourly_rate AS talent_hourly_rate,
          tc.name AS talent_city,
          t.availability AS availability,

          ut.id AS talent_user_id,
          ut.username AS talent_username,
          ut.email AS talent_email,
          ut.phone_number AS talent_phone_number,

          s.id AS skill_id,
          s.name AS skill_name,

          r.rating AS rating

        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN users uc ON c.user_id = uc.id
        LEFT JOIN talents t ON b.talent_id = t.id
        LEFT JOIN users ut ON t.user_id = ut.id
        LEFT JOIN skills s ON b.skill_id = s.id
        LEFT JOIN cities cc ON c.city = cc.id
        LEFT JOIN cities tc ON t.city = tc.id
        LEFT JOIN (
          SELECT booking_id, MAX(rating) AS rating
          FROM reviews
          WHERE deleted_at IS NULL
          GROUP BY booking_id
        ) r ON r.booking_id = b.id
        WHERE t.user_id = :userId
        ${whereClause}
        ORDER BY b.created_at DESC
        LIMIT :limit OFFSET :offset
      `, { replacements: { userId, searchDate, limit, offset } });

      // ✅ Get total count
      [[{ total }]] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM bookings b
        LEFT JOIN talents t ON b.talent_id = t.id
        WHERE t.user_id = :userId
        ${whereClause}
      `, { replacements: { userId, searchDate } });
      totalCount = total;

    } else if (role === "client") {
      [results] = await sequelize.query(`
        SELECT 
          b.id AS booking_id,
          b.created_at,
          b.time_slot,
          b.status,
          b.note,
          
          c.id AS client_id,
          c.full_name AS client_full_name,
          t.profile_photo AS client_profile_photo,
          c.gender AS client_gender,
          c.country AS client_country,
          cc.name AS client_city,

          uc.id AS client_user_id,
          uc.username AS client_username,
          uc.email AS client_email,
          uc.phone_number AS client_phone_number,

          t.id AS talent_id,
          t.full_name AS talent_full_name,
          t.hourly_rate AS talent_hourly_rate,
          tc.name AS talent_city,
          t.availability AS availability,

          ut.id AS talent_user_id,
          ut.username AS talent_username,
          ut.email AS talent_email,
          ut.phone_number AS talent_phone_number,

          s.id AS skill_id,
          s.name AS skill_name,

          r.rating AS rating

        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN users uc ON c.user_id = uc.id
        LEFT JOIN talents t ON b.talent_id = t.id
        LEFT JOIN users ut ON t.user_id = ut.id
        LEFT JOIN skills s ON b.skill_id = s.id
        LEFT JOIN cities cc ON c.city = cc.id
        LEFT JOIN cities tc ON t.city = tc.id
        LEFT JOIN (
          SELECT booking_id, MAX(rating) AS rating
          FROM reviews
          WHERE deleted_at IS NULL
          GROUP BY booking_id
        ) r ON r.booking_id = b.id
        WHERE c.user_id = :userId
        ${whereClause}
        ORDER BY b.created_at DESC
        LIMIT :limit OFFSET :offset
      `, { replacements: { userId, searchDate, limit, offset } });

      [[{ total }]] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        WHERE c.user_id = :userId
        ${whereClause}
      `, { replacements: { userId, searchDate } });
      totalCount = total;

    } else {
      return res.status(403).json(sendJson(false, 'Invalid role.'));
    }

    let totalHour = 0;
    let totalRate = 0;

    const Bookings = results.map(row => {
      const rate = parseFloat(row.talent_hourly_rate) || 0;
      totalHour += 1;
      totalRate += rate;

      const booking_date = row.created_at
        ? new Date(row.created_at).toISOString().split('T')[0]
        : null;

      return {
        booking_id: row.booking_id,
        booking_date,
        booking_time: row.time_slot || '',
        status: row.status || 'pending',
        description: row.note || '',
        rating: row.rating || null,
        skill_name: row.skill_name || '',   // ✅ keep skill name here

        ...(role === "talent"
          ? {
              client_name: row.client_full_name || '',
              client_country: row.client_country || '',
              client_profile_photo: row.client_profile_photo
                ? (row.client_profile_photo.startsWith('http')
                    ? row.client_profile_photo
                    : `${BASE_URL}/${row.client_profile_photo.replace(/^\//, '')}`)
                : null,
            }
          : {
              talent_name: row.talent_full_name || '',
              talent_profile_photo: row.client_profile_photo
                ? (row.client_profile_photo.startsWith('http')
                    ? row.client_profile_photo
                    : `${BASE_URL}/${row.client_profile_photo.replace(/^\//, '')}`)
                : null,
            })
      };
    });

    const bookings = {
      totaltask: Bookings.length,
      totalHour,
      rating: Bookings.length > 0 ? (Bookings[0].rating || 0) : 0,
      booking: Bookings.map(b => ({
        skillname: b.skill_name,
        location: role === "talent" ? b.client_country : '',
        status: b.status,
        time: b.booking_time,
        day: b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-US', { weekday: 'long' }) : '',
        date: b.booking_date,
        description: b.description,
        bookingid: b.booking_id,
        profilePhoto: role === "talent" ? b.client_profile_photo : b.talent_profile_photo,
        rating: b.rating || 0
      })),
      totalRecords: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    };

    return res.status(200).json(
      sendJson(true, 'Bookings retrieved successfully', bookings)
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch bookings', {
        error: error.message
      })
    );
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { talent_id, skill_id, dates, time_slots, note } = req.body;

    // Validate input
    if (!talent_id || !skill_id || !Array.isArray(dates) || !Array.isArray(time_slots)) {
      return res.status(400).json(
        sendJson(false, 'Talent ID, skill ID, dates and time slots are required')
      );
    }

    // Get client profile
    const client = await Client.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }]
    });

    if (!client) {
      return res.status(404).json(sendJson(false, 'Client profile not found'));
    }

    // Validate talent
    const talent = await Talent.findByPk(talent_id);
    if (!talent) {
      return res.status(404).json(sendJson(false, 'Talent not found'));
    }

    // Validate skill
    const skill = await Skill.findByPk(skill_id);
    if (!skill) {
      return res.status(404).json(sendJson(false, 'Skill not found'));
    }

    // Prepare bookings and check existing
    const bookingData = [];
    const duplicates = [];

    for (const date of dates) {
      for (const slot of time_slots) {
        const existing = await Booking.findOne({
          where: {
            client_id: client.id,
            talent_id,
            created_at: date,
            time_slot: slot
          }
        });

        if (existing) {
          duplicates.push({ date, time_slot: slot });
        } else {
          bookingData.push({
            client_id: client.id,
            talent_id,
            skill_id,
            created_at: date,
            time_slot: slot,
            note: note || null,
            status: 'pending'
          });
        }
      }
    }

    let createdBookings = [];
    if (bookingData.length > 0) {
      createdBookings = await Booking.bulkCreate(bookingData);
    }

    return res.status(201).json(
      sendJson(true, 'Booking request processed', {
        created_count: createdBookings.length,
        skipped_count: duplicates.length,
        created: createdBookings,
        already_exists: duplicates
      })
    );

  } catch (error) {
    console.error('Booking creation error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to create bookings', { error: error.message })
    );
  }
};

// Add this new controller function to your bookings controller file
exports.getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json(
        sendJson(false, 'Booking ID is required')
      );
    }

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    const role = req.user.role; // ✅ Use logged in user role

    // Use raw SQL query to fetch booking details
    const results = await sequelize.query(`
      SELECT 
        b.id AS booking_id,
        b.created_at,
        b.time_slot,
        b.status,
        b.note,
        b.skill_id,
        
        c.id AS client_id,
        c.full_name AS client_full_name,
        c.city AS client_city,
        cc.name AS client_city_name,
        ctryc.name AS client_country_name,
        c.profile_photo AS client_profile_photo,
        c.user_id AS client_user_id,

        t.id AS talent_id,
        t.full_name AS talent_full_name,
        t.city AS talent_city,
        tcc.name AS talent_city_name,
        tctry.name AS talent_country_name,
        t.profile_photo AS talent_profile_photo,
        t.user_id AS talent_user_id,

        s.id AS skill_id,
        s.name AS skill_name,
        rv.id AS review_id
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN talents t ON b.talent_id = t.id
      LEFT JOIN skills s ON b.skill_id = s.id
      LEFT JOIN reviews rv ON b.id = rv.booking_id
      LEFT JOIN cities cc ON c.city = cc.id
      LEFT JOIN countries ctryc ON cc.country_id = ctryc.id
      LEFT JOIN cities tcc ON t.city = tcc.id
      LEFT JOIN countries tctry ON tcc.country_id = tctry.id
      
      WHERE b.id = :bookingId
      LIMIT 1
    `, {
      replacements: { bookingId },
      type: sequelize.QueryTypes.SELECT
    });

    if (!results || results.length === 0) {
      return res.status(404).json(
        sendJson(false, 'Booking not found')
      );
    }

    const row = results[0];

    // Format time
    let time = "12:00 AM";
    if (row.time_slot) {
      try {
        const [startTime] = row.time_slot.split(' - ');
        if (startTime) {
          const [hourStr = '0', minuteStr = '0'] = startTime.split(':');
          const hour = parseInt(hourStr, 10);
          const minute = parseInt(minuteStr, 10);
          const timeDate = new Date();
          timeDate.setHours(hour, minute, 0, 0);
          time = timeDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch (e) {
        console.error('Time formatting error:', e);
      }
    }

    // Format date
    let date = "";
    try {
      if (row.created_at) {
        const createdDate = new Date(row.created_at);
        if (!isNaN(createdDate.getTime())) {
          date = createdDate.toISOString().split('T')[0];
        }
      }
    } catch (e) {
      console.error('Date formatting error:', e);
    }

    // Format location
    const locationParts = [];
    if (row.talent_city_name && row.talent_country_name) {
      locationParts.push(`${row.talent_city_name}, ${row.talent_country_name}`);
    }
    if (row.client_city_name && row.client_country_name) {
      locationParts.push(`${row.client_city_name}, ${row.client_country_name}`);
    }
    const location = locationParts.join(' | ');

    // Prepare profile photos
    const clientProfilePhoto = row.client_profile_photo
      ? row.client_profile_photo.startsWith('http')
        ? row.client_profile_photo
        : `${BASE_URL}/${row.client_profile_photo.replace(/^\//, '')}`
      : null;

    const talentProfilePhoto = row.talent_profile_photo
      ? row.talent_profile_photo.startsWith('http')
        ? row.talent_profile_photo
        : `${BASE_URL}/${row.talent_profile_photo.replace(/^\//, '')}`
      : null;

    // ✅ Role based response formatting
    let response;
    if (role === "talent") {
      // Show client details if logged in as Talent
      response = {
        booking_id: row.booking_id,
        date,
        time,
        location,
        status: row.status || 'pending',
        username: row.client_full_name || '',
        profilePhoto: clientProfilePhoto,
        description: row.note || '',
        skill: row.skill_name || '',
        review_id: row.review_id || ''
      };
    } else if (role === "client") {
      // Show talent details if logged in as Client
      response = {
        booking_id: row.booking_id,
        date,
        time,
        location,
        status: row.status || 'pending',
        username: row.talent_full_name || '',
        profilePhoto: talentProfilePhoto,
        description: row.note || '',
        skill: row.skill_name || '',
        review_id: row.review_id || ''
      };
    } else {
      return res.status(403).json(sendJson(false, 'Invalid role.'));
    }

    return res.status(200).json(
      sendJson(true, 'Booking details retrieved successfully', response)
    );

  } catch (error) {
    console.error('Error fetching booking details:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to fetch booking details', { error: error.message })
    );
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { booking_id, status } = req.body;

    if (!booking_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'booking_id and status are required'
      });
    }

    if (!BookingStatusEnum.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
        valid_statuses: BookingStatusEnum
      });
    }

    const booking = await Booking.findByPk(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // If trying to mark as completed or reviewedAndCompleted
    if (status === 'completed' || status === 'reviewedAndCompleted') {
      const review = await Review.findOne({
        where: { booking_id: booking.id }
      });

      if (!review) {
        // No review found, mark as review pending instead
        booking.status = 'reviewPending';
        await booking.save();

        return res.status(200).json({
          success: true,
          message: 'Review is still pending. Status set to reviewPending.',
          updated_booking: booking
        });
      }
    }

    // Update status normally
    booking.status = status;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      updated_booking: booking
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
exports.ByDateBookings = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    const searchDate = req.query.date || null;

    let whereClause = '';
    if (searchDate) {
      whereClause = `WHERE DATE(b.created_at) = :searchDate`;
    }

    const [results] = await sequelize.query(
      `
      SELECT 
        t.full_name AS talent_name,
        DATE(b.created_at) AS booking_date,
        b.time_slot AS booking_time,
        b.id AS booking_id,
        r.rating,
        t.country AS talent_country,
        t.profile_photo AS profile_photo
      FROM bookings b
      LEFT JOIN talents t ON b.talent_id = t.id
      LEFT JOIN reviews r ON r.booking_id = b.id AND r.deleted_at IS NULL
      ${whereClause}
      ORDER BY b.created_at DESC
      `,
      {
        replacements: { searchDate },
      }
    );

    const simplifiedBookings = results.map(row => {
      const profileImage = row.profile_photo
        ? row.profile_photo.startsWith('http')
          ? row.profile_photo
          : `${BASE_URL}/${row.profile_photo.replace(/^\//, '')}`
        : null;

      return {
        booking_id: row.booking_id || '',
        talent_name: row.talent_name || '',
        booking_date: row.booking_date || '',
        booking_time: row.booking_time || '',
        rating: row.rating || null,
        talent_country: row.talent_country || '',
        profile_photo: profileImage
      };
    });

    return res.status(200).json(
      sendJson(true, 'Bookings retrieved successfully', {
        Bookings: simplifiedBookings
      })
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch bookings', {
        error: error.message
      })
    );
  }
};

exports.MyBookingsForTalent = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    const userId = req.user.id;
    const role = req.user.role;

    let results = [];

    if (role === "talent") {
      [results] = await sequelize.query(
        `SELECT 
            b.id AS booking_id,
            c.full_name AS client_name,
            t.full_name AS talent_name,
            DATE(b.created_at) AS booking_date,
            b.time_slot AS booking_time,
            r.rating,
            c.country AS client_country,
            c.profile_photo AS client_profile_photo,
            t.profile_photo AS talent_profile_photo
         FROM bookings b
         JOIN clients c ON b.client_id = c.id
         JOIN talents t ON b.talent_id = t.id
         LEFT JOIN (
            SELECT booking_id, MAX(rating) AS rating
            FROM reviews
            WHERE deleted_at IS NULL
            GROUP BY booking_id
         ) r ON r.booking_id = b.id
         WHERE t.user_id = :userId
         ORDER BY b.created_at DESC`,
        { replacements: { userId } }
      );
    } else if (role === "client") {
      [results] = await sequelize.query(
        `SELECT 
            b.id AS booking_id,
            c.full_name AS client_name,
            t.full_name AS talent_name,
            DATE(b.created_at) AS booking_date,
            b.time_slot AS booking_time,
            r.rating,
            c.country AS client_country,
            c.profile_photo AS client_profile_photo,
            t.profile_photo AS talent_profile_photo
         FROM bookings b
         JOIN clients c ON b.client_id = c.id
         JOIN talents t ON b.talent_id = t.id
         LEFT JOIN (
            SELECT booking_id, MAX(rating) AS rating
            FROM reviews
            WHERE deleted_at IS NULL
            GROUP BY booking_id
         ) r ON r.booking_id = b.id
         WHERE c.user_id = :userId
         ORDER BY b.created_at DESC`,
        { replacements: { userId } }
      );
    } else {
      return res.status(403).json(sendJson(false, 'Invalid role.'));
    }

    const bookings = results.map(row => ({
      booking_id: row.booking_id || '',
      client_name: row.client_name || '',
      talent_name: row.talent_name || '',
      booking_date: row.booking_date || '',
      booking_time: row.booking_time || '',
      rating: row.rating || null,
      client_country: row.client_country || '',
      client_profile_photo: row.client_profile_photo
        ? row.client_profile_photo.startsWith('http')
          ? row.client_profile_photo
          : `${BASE_URL}/${row.client_profile_photo.replace(/^\//, '')}`
        : null,
      talent_profile_photo: row.talent_profile_photo
        ? row.talent_profile_photo.startsWith('http')
          ? row.talent_profile_photo
          : `${BASE_URL}/${row.talent_profile_photo.replace(/^\//, '')}`
        : null
    }));

    return res.status(200).json(
      sendJson(true, 'Your bookings retrieved successfully', { bookings })
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch your bookings', { error: error.message })
    );
  }
};

exports.MyBookingSlotsForTalent = async (req, res) => {
  try {
    const talentId = req.user.id;

    const [results] = await sequelize.query(
      `SELECT 
        DATE(b.created_at) AS booking_date,
        b.time_slot AS booking_time
      FROM bookings b
      JOIN talents t ON b.talent_id = t.id
      WHERE t.user_id = :talentId
      ORDER BY b.created_at ASC`,
      {
        replacements: { talentId }
      }
    );

    // Group by booking_date with only time in slots
    const grouped = results.reduce((acc, row) => {
      const date = row.booking_date;
      if (!acc[date]) {
        acc[date] = {
          booking_date: date,
          slots: []
        };
      }
      acc[date].slots.push({
        booking_time: row.booking_time
      });
      return acc;
    }, {});

    const bookings = Object.values(grouped);

    return res.status(200).json(
      sendJson(true, 'All booking slots retrieved', { bookings })
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch booking slots', { error: error.message })
    );
  }
};
exports.bookingsSlotshaveclient = async (req, res) => {
  try {
    const { bookingdates } = req.body; // expect array in body

    if (!bookingdates || !Array.isArray(bookingdates) || bookingdates.length === 0) {
      return res.status(400).json(
        sendJson(false, 'bookingdates array is required')
      );
    }

    const [results] = await sequelize.query(`
      SELECT 
        DATE(b.created_at) AS booking_date,
        b.time_slot AS booking_time
      FROM bookings b
      LEFT JOIN talents t ON b.talent_id = t.id
      WHERE DATE(b.created_at) IN (:bookingdates)
      ORDER BY b.created_at ASC
    `, {
      replacements: { bookingdates }
    });

    // Group by booking_date
    const grouped = results.reduce((acc, row) => {
      const date = row.booking_date;
      if (!acc[date]) {
        acc[date] = {
          booking_date: date,
          slots: []
        };
      }
      acc[date].slots.push({
        booking_time: row.booking_time
      });
      return acc;
    }, {});

    const bookings = Object.values(grouped);

    return res.status(200).json(
      sendJson(true, 'Filtered bookings retrieved successfully', { bookings })
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch filtered bookings', { error: error.message })
    );
  }
};

