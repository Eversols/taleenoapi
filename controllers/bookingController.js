const { Booking, Client, Talent, User, Skill ,Review} = require('../models');
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
    
    const [results] = await sequelize.query(`
      SELECT 
        b.id AS booking_id,
        b.created_at,
        b.time_slot,
        b.status,
        b.note,
        
        c.id AS client_id,
        c.full_name AS client_full_name,
        c.profile_photo AS profile_photo,
        c.gender AS client_gender,
        c.country AS client_country,
        c.city AS client_city,

        uc.id AS client_user_id,
        uc.username AS client_username,
        uc.email AS client_email,
        uc.phone_number AS client_phone_number,

        t.id AS talent_id,
        t.full_name AS talent_full_name,
        t.hourly_rate AS talent_hourly_rate,
        t.city AS talent_city,
        t.availability AS availability,

        ut.id AS talent_user_id,
        ut.username AS talent_username,
        ut.email AS talent_email,
        ut.phone_number AS talent_phone_number,

        s.id AS skill_id,
        s.name AS skill_name

      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN users uc ON c.user_id = uc.id
      LEFT JOIN talents t ON b.talent_id = t.id
      LEFT JOIN users ut ON t.user_id = ut.id
      LEFT JOIN skills s ON b.skill_id = s.id
      ORDER BY b.created_at DESC
    `);

    let totalHour = 0;
    let totalRate = 0;

    const Bookings = results.map(row => {
      const rate = parseFloat(row.talent_hourly_rate) || 0;
      totalHour += 1;
      totalRate += rate;

      let time = "12:00 AM";
      let dates = "1970-01-01";
      let day = "Monday";

      try {
        const createdDate = new Date(row.created_at);
        if (!isNaN(createdDate.getTime())) {
          dates = createdDate.toISOString().split('T')[0];
          day = createdDate.toLocaleDateString('en-US', { weekday: 'long' });
        }

        if (typeof row.time_slot === 'string') {
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
        }
      } catch (e) {
        console.error('Formatting error:', e);
      }

      const profileImage = row.profile_photo
        ? row.profile_photo.startsWith('http')
          ? row.profile_photo
          : `${BASE_URL}/${row.profile_photo.replace(/^\//, '')}`
        : null;

      const locationParts = [row.talent_city, row.client_city].filter(Boolean);
      const location = locationParts.join(', ');

      return {
        profileImage,
        booking_id: row.booking_id || '',
        mainTalent: row.talent_full_name || '',
        location,
        date: parseAvailability(row.availability),
        time,
        dates,
        day,
        status: row.status || 'pending',
        description: row.note || ''
      };
    });
      return res.status(200).json(
          sendJson(true, 'Bookings retrieved successfully', {
          totalTask: Bookings.length,
          totalHour,
          totalRate: parseFloat(totalRate.toFixed(2)),
          Bookings
        })
      );

  } catch (error) {

     return res.status(500).json(
          sendJson(true, 'Failed to fetch bookings', {
          totalTask: Bookings.length,
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
        c.profile_photo AS client_profile_photo,
        c.user_id AS client_user_id,

        t.id AS talent_id,
        t.full_name AS talent_full_name,
        t.city AS talent_city,
        t.profile_photo AS talent_profile_photo,
        t.user_id AS talent_user_id,

        s.id AS skill_id,
        s.name AS skill_name

      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN talents t ON b.talent_id = t.id
      LEFT JOIN skills s ON b.skill_id = s.id
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
    if (row.talent_city) locationParts.push(row.talent_city);
    if (row.client_city) locationParts.push(row.client_city);
    const location = locationParts.join(', ');

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

    // Prepare response
    const response = {
      booking_id: row.booking_id,
      date,
      time,
      location,
      status: row.status || 'pending',
      talent_name: row.talent_full_name || '',
      client_name: row.client_full_name || '',
      client_message: row.note || '',
      client_profile_photo: clientProfilePhoto,
      talent_profile_photo: talentProfilePhoto,
      skill: row.skill_name || ''
    };

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
    const talentId = req.user.id; // Assuming talent ID comes from auth middleware

    const [results] = await sequelize.query(
      `SELECT 
        c.full_name AS client_name,
        DATE(b.created_at) AS booking_date,
        b.time_slot AS booking_time,
        r.rating,
        c.country AS client_country,
        c.profile_photo AS client_profile_photo,
        t.profile_photo AS talent_profile_photo
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      LEFT JOIN reviews r ON r.booking_id = b.id AND r.deleted_at IS NULL
      JOIN talents t ON b.talent_id = t.id
      WHERE t.user_id = :talentId
      ORDER BY b.created_at DESC`,
      { replacements: { talentId } }
    );

    const bookings = results.map(row => ({
      client_name: row.client_name || '',
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
      sendJson(true, 'Your bookings retrieved successfully', {
        bookings
      })
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch your bookings', {
        error: error.message
      })
    );
  }
};
// here slots start
// ...............................
// ...............................
// ...............................
// ...............................
// ...............................
exports.MyBookingSlotsForTalent = async (req, res) => {
  try {
    const talentId = req.user.id;

    // Expect these in query or body: start_date, end_date
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json(
        sendJson(false, 'Start date and end date are required')
      );
    }

    const [results] = await sequelize.query(
      `SELECT 
        DATE(b.created_at) AS booking_date,
        b.time_slot AS booking_time
      FROM bookings b
      JOIN talents t ON b.talent_id = t.id
      WHERE t.user_id = :talentId
        AND DATE(b.created_at) BETWEEN :startDate AND :endDate
      ORDER BY b.created_at ASC`,
      {
        replacements: {
          talentId,
          startDate: start_date,
          endDate: end_date
        }
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
      sendJson(true, 'Date-wise booking slots retrieved', { bookings })
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch booking slots', { error: error.message })
    );
  }
};
exports.bookingsSlotshaveclient = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json(
        sendJson(false, 'Start date and end date are required')
      );
    }

    const [results] = await sequelize.query(`
      SELECT 
        DATE(b.created_at) AS booking_date,
        b.time_slot AS booking_time
      FROM bookings b
      LEFT JOIN talents t ON b.talent_id = t.id
      WHERE DATE(b.created_at) BETWEEN :startDate AND :endDate
      ORDER BY b.created_at ASC
    `, {
      replacements: {
        startDate: start_date,
        endDate: end_date
      }
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
      sendJson(true, 'Date-wise slots retrieved successfully', { bookings })
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch date-wise slots', { error: error.message })
    );
  }
};
