const { Booking, Client, Talent, User, Skill, Review ,BookingSlot} = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const axios = require("axios");
const { Payment } = require("../models");
const https = require("https");
const querystring = require("querystring");
const { sendJson } = require('../utils/helpers');

const BookingStatusEnum = [
'pending', 
'accepted',
'paymentPending',
'rejected',
'inProgress',
'completed',
'reviewPending',
'requestedForRescheduleByUser',
'requestedForRescheduleByTalent',
'canceledByUser',
'canceledByTalent',
'isPaid',
'confirm'
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
    const { talent_id, skill_id, time_slots, note } = req.body;

    // Validate input
    if (!talent_id || !skill_id || typeof time_slots !== 'object') {
      return res.status(400).json(
        sendJson(false, 'Talent ID, skill ID and time slots are required')
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

    // ✅ Create main booking record
    const booking = await Booking.create({
      client_id: client.id,
      talent_id,
      skill_id,
      note: note || null,
      status: 'pending'
    });

    // ✅ Insert slots
    const slotData = [];
    const duplicates = [];

    for (const [date, slots] of Object.entries(time_slots)) {
      for (const slot of slots) {
        // check if slot already exists for this booking
        const existing = await BookingSlot.findOne({
          where: { booking_id: booking.id, slot_date: date, slot }
        });

        if (existing) {
          duplicates.push({ date, slot });
        } else {
          slotData.push({
            booking_id: booking.id,
            slot_date: date,
            slot
          });
        }
      }
    }

    let createdSlots = [];
    if (slotData.length > 0) {
      createdSlots = await BookingSlot.bulkCreate(slotData);
    }

    return res.status(201).json(
      sendJson(true, 'Booking request processed', {
        booking_id: booking.id,
        booking_slots: createdSlots,
      })
    );

  } catch (error) {
    console.error('Booking creation error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to create booking', { error: error.message })
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
        user_id : row.client_user_id,
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
        user_id : row.talent_user_id,
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
    const searchDates = req.body?.bookingdates || null; // allow multiple dates

    // Assume req.user.role is either "talent" or "client"
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json(
        sendJson(false, 'Unauthorized: Role not found')
      );
    }

    let whereClause = '';
    if (searchDates && searchDates.length) {
      whereClause = `WHERE bs.slot_date IN (:searchDates)`;
    } else if (searchDate) {
      whereClause = `WHERE bs.slot_date = :searchDate`;
    }

    // Decide what to select depending on role
    const selectFields =
      userRole === 'talent'
        ? `
            c.full_name AS client_name,
            c.country AS client_country,
            c.profile_photo AS profile_photo
          `
        : `
            t.full_name AS talent_name,
            t.country AS talent_country,
            t.profile_photo AS profile_photo
          `;

    const joinClause =
      userRole === 'talent'
        ? `LEFT JOIN clients c ON b.client_id = c.id`
        : `LEFT JOIN talents t ON b.talent_id = t.id`;

    const [results] = await sequelize.query(
      `
      SELECT 
        b.id AS booking_id,
        b.note AS description,
        b.status AS status,
        bs.slot_date AS booking_date,
        bs.slot AS booking_time,
        r.rating,
        ${selectFields}
      FROM booking_slots bs
      JOIN bookings b ON bs.booking_id = b.id
      ${joinClause}
      LEFT JOIN reviews r ON r.booking_id = b.id AND r.deleted_at IS NULL
      ${whereClause}
      ORDER BY bs.slot_date DESC, bs.slot ASC
      `,
      {
        replacements: { searchDate, searchDates },
      }
    );

    // Map data depending on role
    const simplifiedBookings = results.map(row => {
      const profileImage = row.profile_photo
        ? row.profile_photo.startsWith('http')
          ? row.profile_photo
          : `${BASE_URL}/${row.profile_photo.replace(/^\//, '')}`
        : null;

      if (userRole === 'talent') {
        return {
          booking_id: row.booking_id || '',
          status: row.status || '',
          name: row.client_name || '',
          description: row.description || '',
          booking_date: row.booking_date || '',
          booking_time: row.booking_time || '',
          rating: row.rating || null,
          country: row.client_country || '',
          profile_photo: profileImage
        };
      } else {
        return {
          booking_id: row.booking_id || '',
          status: row.status || '',
          name: row.talent_name || '',
          description: row.description || '',
          booking_date: row.booking_date || '',
          booking_time: row.booking_time || '',
          rating: row.rating || null,
          country: row.talent_country || '',
          profile_photo: profileImage
        };
      }
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
            bs.slot_date AS booking_date,
            bs.slot AS booking_time,
            r.rating,
            c.country AS client_country,
            c.profile_photo AS client_profile_photo,
            t.profile_photo AS talent_profile_photo
         FROM booking_slots bs
         JOIN bookings b ON bs.booking_id = b.id
         JOIN clients c ON b.client_id = c.id
         JOIN talents t ON b.talent_id = t.id
         LEFT JOIN (
            SELECT booking_id, MAX(rating) AS rating
            FROM reviews
            WHERE deleted_at IS NULL
            GROUP BY booking_id
         ) r ON r.booking_id = b.id
         WHERE t.user_id = :userId
         ORDER BY bs.slot_date DESC, bs.slot ASC`,
        { replacements: { userId } }
      );
    } else if (role === "client") {
      [results] = await sequelize.query(
        `SELECT 
            b.id AS booking_id,
            c.full_name AS client_name,
            t.full_name AS talent_name,
            bs.slot_date AS booking_date,
            bs.slot AS booking_time,
            r.rating,
            c.country AS client_country,
            c.profile_photo AS client_profile_photo,
            t.profile_photo AS talent_profile_photo
         FROM booking_slots bs
         JOIN bookings b ON bs.booking_id = b.id
         JOIN clients c ON b.client_id = c.id
         JOIN talents t ON b.talent_id = t.id
         LEFT JOIN (
            SELECT booking_id, MAX(rating) AS rating
            FROM reviews
            WHERE deleted_at IS NULL
            GROUP BY booking_id
         ) r ON r.booking_id = b.id
         WHERE c.user_id = :userId
         ORDER BY bs.slot_date DESC, bs.slot ASC`,
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
        bs.slot_date AS booking_date,
        bs.slot AS booking_time
      FROM booking_slots bs
      JOIN bookings b ON bs.booking_id = b.id
      JOIN talents t ON b.talent_id = t.id
      WHERE bs.slot_date IN (:bookingdates)
      ORDER BY bs.slot_date ASC, bs.slot ASC
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

exports.MyBookingSlotsForClient = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { bookingdates } = req.body; // <-- get from body

    const [results] = await sequelize.query(
      `SELECT 
        bs.slot_date AS booking_date,
        bs.slot AS booking_time
      FROM booking_slots bs
      JOIN bookings b ON bs.booking_id = b.id
      JOIN clients c ON b.client_id = c.id
      WHERE c.user_id = :clientId
      ${bookingdates && bookingdates.length ? 'AND bs.slot_date IN (:bookingdates)' : ''}
      ORDER BY bs.slot_date ASC, bs.slot ASC`,
      {
        replacements: { clientId, bookingdates }
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
exports.rescheduleBooking = async (req, res) => {
  try {
    const { booking_id, new_date, new_time } = req.body;
    const role = req.user.role;

    if (!booking_id || !new_date || !new_time) {
      return res.status(400).json(
        sendJson(false, "booking_id, new_date and new_time are required")
      );
    }

    // Find booking
    const booking = await Booking.findByPk(booking_id);
    if (!booking) {
      return res.status(404).json(sendJson(false, "Booking not found"));
    }

    // ✅ Only client or talent who owns the booking can request reschedule
    let owner;
    if (role === "client") {
      owner = await Client.findOne({ where: { user_id: req.user.id } });
      if (!owner || booking.client_id !== owner.id) {
        return res.status(403).json(sendJson(false, "Not authorized to reschedule this booking"));
      }

    } else if (role === "talent") {
      owner = await Talent.findOne({ where: { user_id: req.user.id } });
      if (!owner || booking.talent_id !== owner.id) {
        return res.status(403).json(sendJson(false, "Not authorized to reschedule this booking"));
      }
    } else {
      return res.status(403).json(sendJson(false, "Invalid role"));
    }

    // ✅ Update booking new schedule
    await Booking.update(
      { created_at: new_date, time_slot: new_time },
      { where: { id: booking_id } }
    );


    return res.status(200).json(
      sendJson(true, "Booking rescheduled successfully", {
        booking_id: booking.id,
        new_date,
        new_time,
      })
    );
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    return res.status(500).json(
      sendJson(false, "Failed to reschedule booking", { error: error.message })
    );
  }
};



exports.createCheckout = async (req, res) => {
  try {
    const {
      amount,
      merchantTransactionId,
      email,
      street,
      city,
      state,
      country,
      postcode,
      givenName,
      surname,
      booking_id // <-- must come from req.body if updating
    } = req.body;

    if (!amount || !email || !merchantTransactionId || !booking_id) {
      return res.status(400).json(sendJson(false, "Missing required fields"));
    }

    // Build request data
    const data = querystring.stringify({
      entityId: "8ac7a4c79483092601948366b9d1011b",
      amount: parseFloat(amount).toFixed(2),
      currency: "SAR",
      paymentType: "DB",
      testMode: "EXTERNAL",
      "customParameters[3DS2_enrolled]": "true",
      merchantTransactionId,
      "customer.email": email,
      "billing.street1": street,
      "billing.city": city,
      "billing.state": state,
      "billing.country": country,
      "billing.postcode": postcode,
      "customer.givenName": givenName,
      "customer.surname": surname
    });

    // HTTPS request options
    const options = {
      port: 443,
      host: "eu-test.oppwa.com",
      path: "/v1/checkouts",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": data.length,
        Authorization:
          "Bearer OGFjN2E0Yzc5NDgzMDkyNjAxOTQ4MzY2MzY1ZDAxMTZ8NnpwP1Q9Y3dGTiUyYWN6NmFmQWo="
      }
    };

    // Call HyperPay API
    const response = await new Promise((resolve, reject) => {
      const buf = [];
      const postRequest = https.request(options, (resHyperpay) => {
        resHyperpay.on("data", (chunk) => buf.push(chunk));
        resHyperpay.on("end", () => {
          try {
            const json = JSON.parse(Buffer.concat(buf).toString("utf8"));
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      });
      postRequest.on("error", reject);
      postRequest.write(data);
      postRequest.end();
    });

    let booking;
    if (booking_id) {
      // 🔹 Update existing booking
      booking = await Booking.findByPk(booking_id);
      if (!booking) {
        return res.status(404).json(sendJson(false, "Booking not found"));
      }

      await booking.update({
        user_id: req.user.id,
        transaction_id: merchantTransactionId,
        amount: parseFloat(amount).toFixed(2),
        currency: "SAR",
        status: "PENDING",
        checkout_id: response.id,
        payment_type: "DB"
      });
    } else {
      // 🔹 Create new booking
      booking = await Booking.create({
        user_id: req.user.id,
        transaction_id: merchantTransactionId,
        amount: parseFloat(amount).toFixed(2),
        currency: "SAR",
        status: "PENDING",
        checkout_id: response.id,
        payment_type: "DB"
      });
    }

    return res.status(201).json(
      sendJson(true, "Checkout created successfully", {
        booking
      })
    );
  } catch (error) {
    console.error("HyperPay Checkout Error:", error);
    return res
      .status(500)
      .json(sendJson(false, "Failed to create checkout", { error: error.message }));
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const { checkoutId, booking_id } = req.query;

    // Call HyperPay to get payment status
    const response = await axios.get(
      `https://eu-test.oppwa.com/v1/checkouts/${checkoutId}/payment?entityId=8ac7a4c79483092601948366b9d1011b`,
      {
        headers: {
          Authorization:
            "Bearer OGFjN2E0Yzc5NDgzMDkyNjAxOTQ4MzY2MzY1ZDAxMTZ8NnpwP1Q9Y3dGTiUyYWN6NmFmQWo=",
        },
      }
    );

    const result = response.data; // ✅ only safe JSON data
    let booking = null;

    // If booking exists, update its status based on payment result
    if (booking_id) {
      booking = await Booking.findByPk(booking_id);
      if (!booking) {
        return res.status(404).json(sendJson(false, "Booking not found"));
      }

      // ✅ Check HyperPay result.code for success
      if (result.result && result.result.code && result.result.code.startsWith("000.")) {
        await booking.update({ status: "isPaid" });
      }
    }

    return res.status(200).json(
      sendJson(true, "Payment status retrieved", {
        paymentResult: result,
        booking: booking ? booking.toJSON() : null,
      })
    );
  } catch (error) {
    console.error("Payment Status Error:", error.message);
    return res
      .status(500)
      .json(sendJson(false, "Failed to fetch payment status", { error: error.message }));
  }
};
exports.TalentAvailability = async (req, res) => {
  try {
    const { bookingdates, talent_id } = req.body;

    if (!bookingdates || !Array.isArray(bookingdates) || bookingdates.length === 0) {
      return res.status(400).json({ status: false, message: 'bookingdates array is required', data: {} });
    }

    if (!talent_id) {
      return res.status(400).json({ status: false, message: 'talent_id is required', data: {} });
    }

    // Fetch booked slots
    const [bookedSlots] = await sequelize.query(`
      SELECT 
        bs.slot_date AS booking_date,
        bs.slot AS booking_time
      FROM booking_slots bs
      JOIN bookings b ON bs.booking_id = b.id
      WHERE bs.slot_date IN (:bookingdates)
      AND b.talent_id = :talent_id
      ORDER BY bs.slot_date ASC, bs.slot ASC
    `, { replacements: { bookingdates, talent_id } });

    // Fetch talent availability
    const [talentResult] = await sequelize.query(`
      SELECT availability
      FROM talents
      WHERE id = :talent_id
      LIMIT 1
    `, { replacements: { talent_id } });

    const weeklyAvailability = talentResult[0] && talentResult[0].availability
      ? JSON.parse(talentResult[0].availability)
      : {};

    const weekdayMap = {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday'
    };

    // Build response per date
    const data = bookingdates.map(dateStr => {
      const weekday = weekdayMap[new Date(dateStr).getDay()];

      // Get booked slots for this date
      const booked_slots = bookedSlots
        .filter(s => s.booking_date === dateStr)
        .map(s => ({ booking_time: s.booking_time }));

      // Get talent slots for this date
      const talent_slots = (weeklyAvailability[weekday] || []).map(slot => ({ booking_time: slot }));

      return {
        date: dateStr,
        booked_slots,
        talent_slots
      };
    });

    return res.status(200).json({
      status: true,
      message: 'Filtered bookings and talent availability retrieved successfully',
      data
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch filtered bookings',
      data: { error: error.message }
    });
  }
};

