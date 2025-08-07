const { Booking, Client, Talent, User, Skill } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { sendJson } = require('../utils/helpers');


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