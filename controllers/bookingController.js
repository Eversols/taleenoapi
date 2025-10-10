const { Booking, Client, Talent, User, Skill, Review ,BookingSlot ,BookingReschedule} = require('../models');
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
          cc.name AS client_city_name,
          ctryc.name AS client_country_name,

          uc.id AS client_user_id,
          uc.username AS client_username,
          uc.email AS client_email,
          uc.phone_number AS client_phone_number,

          t.id AS talent_id,
          t.full_name AS talent_full_name,
          t.hourly_rate AS talent_hourly_rate,
          tcc.name AS talent_city_name,
          tctry.name AS talent_country_name,
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
        LEFT JOIN countries ctryc ON cc.country_id = ctryc.id
        LEFT JOIN cities tcc ON t.city = tcc.id
        LEFT JOIN countries tctry ON tcc.country_id = tctry.id
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
          c.profile_photo AS client_profile_photo,
          c.gender AS client_gender,
          cc.name AS client_city_name,
          ctryc.name AS client_country_name,

          uc.id AS client_user_id,
          uc.username AS client_username,
          uc.email AS client_email,
          uc.phone_number AS client_phone_number,

          t.id AS talent_id,
          t.full_name AS talent_full_name,
          t.profile_photo AS talent_profile_photo,
          t.hourly_rate AS talent_hourly_rate,
          tcc.name AS talent_city_name,
          tctry.name AS talent_country_name,
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
        LEFT JOIN countries ctryc ON cc.country_id = ctryc.id
        LEFT JOIN cities tcc ON t.city = tcc.id
        LEFT JOIN countries tctry ON tcc.country_id = tctry.id
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

      // ✅ Format location like in getBookingDetails
      let location = "";
      if (role === "talent" && row.client_city_name && row.client_country_name) {
        location = `${row.talent_country_name}, ${row.talent_city_name}`;
      } else if (role === "client" && row.talent_city_name && row.talent_country_name) {
        location = `${row.talent_country_name}, ${row.talent_city_name}`;
      }

      return {
        booking_id: row.booking_id,
        booking_date,
        booking_time: row.time_slot || '',
        status: row.status || 'pending',
        description: row.note || '',
        rating: row.rating || null,
        skill_name: row.skill_name || '',
        location, // ✅ proper location added

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
        location: b.location,
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
      sendJson(false, 'Failed to fetch bookings', { error: error.message })
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
    const userId = req.user.id; // ✅ Logged-in user ID (used for reschedule filter)

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
    const talent = await Talent.findByPk(row.talent_id);

    // ✅ Define media object to avoid ReferenceError
    const SkillRate = {};

    if (talent && Array.isArray(talent.skills)) {
      // find the skill object inside array where id matches row.skill_id
      const skill = talent.skills.find(s => Number(s.id) === Number(row.skill_id));

      if (skill) {
        SkillRate.rating = Number(skill.rate);
      }     
    }

    
    // ✅ Fetch only booked slots for this booking (no duplicates)
    const [bookedSlots] = await sequelize.query(`
      SELECT 
        bs.slot_date AS booking_date,
        bs.slot AS booking_time
      FROM booking_slots bs
      WHERE bs.booking_id = :booking_id
      ORDER BY bs.slot_date ASC, bs.slot ASC
    `, { replacements: { booking_id: row.booking_id } });
    const groupedSlots = bookedSlots.reduce((acc, slot) => {
      let existing = acc.find(item => item.booking_date === slot.booking_date);
       if (existing) {
        existing.booking_times.push(slot.booking_time);
      } else {
        acc.push({
          booking_date: slot.booking_date,
          booking_times: [slot.booking_time]
        });
      }
      return acc;
    }, []);

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
      response = {
        booking_id: row.booking_id,
        user_id : row.client_user_id,
        location: [row.talent_country_name, row.talent_city_name].filter(Boolean).join(', '),
        status: row.status || 'pending',
        username: row.client_full_name || '',
        profilePhoto: clientProfilePhoto,
        description: row.note || '',
        skill: row.skill_name || '',
        review_id: row.review_id || '',
        bookedSlots:groupedSlots, // unique slots for this booking
        ...SkillRate
      };
    } else if (role === "client") {
      response = {
        booking_id: row.booking_id,
        user_id : row.talent_user_id,
        location: [row.talent_country_name, row.talent_city_name].filter(Boolean).join(', '),
        status: row.status || 'pending',
        username: row.talent_full_name || '',
        profilePhoto: talentProfilePhoto,
        description: row.note || '',
        skill: row.skill_name || '',
        review_id: row.review_id || '',
        bookedSlots:groupedSlots, // unique slots for this booking
        ...SkillRate
      };
    } else {
      return res.status(403).json(sendJson(false, 'Invalid role.'));
    }
    // 🔹 ADDITION STARTS HERE — show opposite party's reschedule request
    const targetRole = role === 'talent' ? 'client' : 'talent';
    const [rescheduleData] = await sequelize.query(`
      SELECT 
        id,
        booking_id,
        requested_by,
        requested_user_id,
        old_date,
        old_time,
        new_date,
        new_time,
        status,
        remarks,
        createdAt
      FROM booking_reschedules
      WHERE booking_id = :bookingId
      AND requested_by = :targetRole
      ORDER BY id DESC
      LIMIT 1
    `, {
      replacements: { bookingId, targetRole },
      type: sequelize.QueryTypes.SELECT
    });

    response.reschedule = rescheduleData || null;
    // 🔹 ADDITION ENDS HERE

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

    // ✅ get the actual client_id or talent_id linked to this user
    let roleEntityId = null;
    if (userRole === "client") {
      const client = await Client.findOne({ where: { user_id: req.user.id } });
      if (!client) {
        return res.status(404).json(sendJson(false, 'Client record not found'));
      }
      roleEntityId = client.id;
    } else if (userRole === "talent") {
      const talent = await Talent.findOne({ where: { user_id: req.user.id } });
      if (!talent) {
        return res.status(404).json(sendJson(false, 'Talent record not found'));
      }
      roleEntityId = talent.id;
    }

    let whereClause = '';
    if (searchDates && searchDates.length) {
      whereClause = `WHERE bs.slot_date IN (:searchDates)`;
    } else if (searchDate) {
      whereClause = `WHERE bs.slot_date = :searchDate`;
    }

    // ✅ Add filter by the actual client/talent id
    if (userRole === 'client') {
      whereClause += whereClause ? ` AND b.client_id = ${roleEntityId}` : `WHERE b.client_id = ${roleEntityId}`;
    } else if (userRole === 'talent') {
      whereClause += whereClause ? ` AND b.talent_id = ${roleEntityId}` : `WHERE b.talent_id = ${roleEntityId}`;
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
        bs.slot_date AS booking_date,
        bs.slot AS booking_time
      FROM booking_slots bs
      JOIN bookings b ON bs.booking_id = b.id
      JOIN talents t ON b.talent_id = t.id
      WHERE t.user_id = :talentId
      ORDER BY bs.slot_date ASC, bs.slot ASC`,
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

    const [results] = await sequelize.query(
      `SELECT 
        bs.slot_date AS booking_date,
        bs.slot AS booking_time
      FROM booking_slots bs
      JOIN bookings b ON bs.booking_id = b.id
      JOIN clients c ON b.client_id = c.id
      WHERE c.user_id = :clientId
      ORDER BY bs.slot_date ASC, bs.slot ASC`,
      {
        replacements: { clientId }
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
    const { booking_id, old_date, old_time, new_date, new_time } = req.body;
    const role = req.user.role;
    const userId = req.user.id;

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

    // ✅ Authorization: only client or talent can reschedule their own booking
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

    // ✅ Update booking slot(s)
    const slot = await BookingSlot.findOne({
      where: {
        booking_id,
        ...(old_date && { slot_date: old_date }),
        ...(old_time && { slot: old_time })
      }
    });

    if (!slot) {
      return res.status(404).json(sendJson(false, "Original slot not found"));
    }

    // Check for duplicate new slot
    const existing = await BookingSlot.findOne({
      where: { booking_id, slot_date: new_date, slot: new_time }
    });

    if (existing) {
      return res.status(400).json(sendJson(false, "New slot already exists for this booking"));
    }

    const existingRequest = await BookingReschedule.findOne({
      where: {
        booking_id,
        requested_user_id: userId,
        new_date,
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json(
        sendJson(false, "You already have a pending reschedule request for this booking and date")
      );
    }
    // Update slot
    const reschedule = await BookingReschedule.create({
      booking_id,
      requested_by: role,
      requested_user_id: userId,
      old_date,
      old_time,
      new_date,
      new_time,
      status: 'pending'
    });

    return res.status(200).json(
      sendJson(true, "Booking rescheduled successfully", {
        booking_id: booking.id,
        new_date,
        new_time,
        request_status: reschedule.status,
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

exports.AdminBookings = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    const searchDate = req.query.date || null; // Only YYYY-MM-DD
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = '';
    if (searchDate) {
      whereClause = `AND DATE(b.created_at) = :searchDate`;
    }

    // ✅ Fetch ALL bookings (admin, no role restriction)
    const [results] = await sequelize.query(`
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
        cc.name AS client_city_name,
        ctryc.name AS client_country_name,

        uc.id AS client_user_id,
        uc.username AS client_username,
        uc.email AS client_email,
        uc.phone_number AS client_phone_number,

        t.id AS talent_id,
        t.full_name AS talent_full_name,
        t.profile_photo AS talent_profile_photo,
        t.hourly_rate AS talent_hourly_rate,
        tcc.name AS talent_city_name,
        tctry.name AS talent_country_name,
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
      LEFT JOIN countries ctryc ON cc.country_id = ctryc.id
      LEFT JOIN cities tcc ON t.city = tcc.id
      LEFT JOIN countries tctry ON tcc.country_id = tctry.id
      LEFT JOIN (
        SELECT booking_id, MAX(rating) AS rating
        FROM reviews
        WHERE deleted_at IS NULL
        GROUP BY booking_id
      ) r ON r.booking_id = b.id
      WHERE 1=1
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT :limit OFFSET :offset
    `, { replacements: { searchDate, limit, offset } });

    // ✅ Count total
    const [[{ total }]] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM bookings b
      WHERE 1=1
      ${whereClause}
    `, { replacements: { searchDate } });

    let totalHour = 0;
    let totalRate = 0;

    const Bookings = results.map(row => {
      const rate = parseFloat(row.talent_hourly_rate) || 0;
      totalHour += 1;
      totalRate += rate;

      const booking_date = row.created_at
        ? new Date(row.created_at).toISOString().split('T')[0]
        : null;

      // ✅ Always show talent + client details for admin
      let location = "";
      if (row.talent_city_name && row.talent_country_name) {
        location = `${row.talent_country_name}, ${row.talent_city_name}`;
      }

      return {
        booking_id: row.booking_id,
        booking_date,
        booking_time: row.time_slot || '',
        status: row.status || 'pending',
        description: row.note || '',
        rating: row.rating || null,
        skill_name: row.skill_name || '',
        location,
        client_name: row.client_full_name || '',
        client_profile_photo: row.client_profile_photo
          ? (row.client_profile_photo.startsWith('http')
              ? row.client_profile_photo
              : `${BASE_URL}/${row.client_profile_photo.replace(/^\//, '')}`)
          : null,
        talent_name: row.talent_full_name || '',
        talent_profile_photo: row.talent_profile_photo
          ? (row.talent_profile_photo.startsWith('http')
              ? row.talent_profile_photo
              : `${BASE_URL}/${row.talent_profile_photo.replace(/^\//, '')}`)
          : null,
      };
    });

    const bookings = {
      totaltask: Bookings.length,
      totalHour,
      rating: Bookings.length > 0 ? (Bookings[0].rating || 0) : 0,
      booking: Bookings.map(b => ({
        skillname: b.skill_name,
        location: b.location,
        status: b.status,
        time: b.booking_time,
        day: b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-US', { weekday: 'long' }) : '',
        date: b.booking_date,
        description: b.description,
        bookingid: b.booking_id,
        clientName: b.client_name,
        talentName: b.talent_name,
        clientPhoto: b.client_profile_photo,
        talentPhoto: b.talent_profile_photo,
        rating: b.rating || 0
      })),
      totalRecords: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    };

    return res.status(200).json(
      sendJson(true, 'All bookings retrieved successfully (Admin)', bookings)
    );

  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to fetch bookings', { error: error.message })
    );
  }
};
exports.AdminBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json(
        sendJson(false, 'Booking ID is required')
      );
    }

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';

    // ✅ Admin role force set
    const role = "admin";

    // Fetch booking details
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
    const talent = await Talent.findByPk(row.talent_id);

    const SkillRate = {};
    if (talent && Array.isArray(talent.skills)) {
      const skill = talent.skills.find(s => Number(s.id) === Number(row.skill_id));
      if (skill) {
        SkillRate.rating = Number(skill.rate);
      }
    }

    // Get booking slots
    const [bookedSlots] = await sequelize.query(`
      SELECT 
        bs.slot_date AS booking_date,
        bs.slot AS booking_time
      FROM booking_slots bs
      WHERE bs.booking_id = :booking_id
      ORDER BY bs.slot_date ASC, bs.slot ASC
    `, { replacements: { booking_id: row.booking_id } });

    const groupedSlots = bookedSlots.reduce((acc, slot) => {
      let existing = acc.find(item => item.booking_date === slot.booking_date);
      if (existing) {
        existing.booking_times.push(slot.booking_time);
      } else {
        acc.push({
          booking_date: slot.booking_date,
          booking_times: [slot.booking_time]
        });
      }
      return acc;
    }, []);

    // Format date & time
    let date = "";
    if (row.created_at) {
      const createdDate = new Date(row.created_at);
      if (!isNaN(createdDate.getTime())) {
        date = createdDate.toISOString().split('T')[0];
      }
    }

    let time = "";
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

    // Photos
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

    // ✅ Admin full response (both sides visible)
    const response = {
      booking_id: row.booking_id,
      status: row.status || 'pending',
      note: row.note || '',
      skill: row.skill_name || '',
      review_id: row.review_id || '',
      date,
      time,
      client: {
        id: row.client_id,
        name: row.client_full_name,
        city: row.client_city_name,
        country: row.client_country_name,
        profilePhoto: clientProfilePhoto,
        user_id: row.client_user_id
      },
      talent: {
        id: row.talent_id,
        name: row.talent_full_name,
        city: row.talent_city_name,
        country: row.talent_country_name,
        profilePhoto: talentProfilePhoto,
        user_id: row.talent_user_id
      },
      bookedSlots: groupedSlots,
      ...SkillRate
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

exports.approveReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role;
    const userId = req.user.id;

    const reschedule = await BookingReschedule.findByPk(id);
    if (!reschedule) return res.status(404).json(sendJson(false, "Reschedule request not found"));

    if (reschedule.status !== 'pending') {
      return res.status(400).json(sendJson(false, "This request has already been processed"));
    }

    // ✅ Update slot in booking_slots table
    const slot = await BookingSlot.findOne({
      where: { booking_id: reschedule.booking_id, slot_date: reschedule.old_date, slot: reschedule.old_time }
    });

    if (slot) {
      slot.slot_date = reschedule.new_date;
      slot.slot = reschedule.new_time;
      await slot.save();
    }

    // reschedule.status = 'accepted';
    reschedule.status = 'accepted';
    reschedule.request_by = role;
    reschedule.request_user_id = userId;
    await reschedule.save();

return res.status(200).json(sendJson(true, "Reschedule approved successfully"));
  } catch (error) {
    console.error("Error approving reschedule:", error);
    return res.status(500).json(sendJson(false, "Failed to approve reschedule", { error: error.message }));
  }
};

exports.rejectReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const role = req.user.role;
    const userId = req.user.id;

    const reschedule = await BookingReschedule.findByPk(id);
    if (!reschedule) return res.status(404).json(sendJson(false, "Reschedule request not found"));

    if (reschedule.status !== 'pending') {
      return res.status(400).json(sendJson(false, "This request has already been processed"));
    }

    reschedule.status = 'rejected';
    reschedule.remarks = remarks || null;
    reschedule.request_by = role;
    reschedule.request_user_id = userId;
    await reschedule.save();

 return res.status(200).json(sendJson(true, "Reschedule request rejected successfully"));
  } catch (error) {
    console.error("Error rejecting reschedule:", error);
    return res.status(500).json(sendJson(false, "Failed to reject reschedule", { error: error.message }));
  }
};
