const { Booking, Client, Talent, User, Skill } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.getBookings = async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        b.id AS booking_id,
        b.created_at,
        b.time_slot,
        b.status,
        b.note,
        
        c.id AS client_id,
        c.full_name AS client_full_name,
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

    const bookings = results.map(row => ({
      id: row.booking_id,
      created_at: row.created_at,
      time_slot: row.time_slot,
      status: row.status,
      note: row.note,
      client: {
        id: row.client_id,
        full_name: row.client_full_name,
        gender: row.client_gender,
        country: row.client_country,
        city: row.client_city,
        user: {
          id: row.client_user_id,
          username: row.client_username,
          email: row.client_email,
          phone_number: row.client_phone_number
        }
      },
      talent: {
        id: row.talent_id,
        full_name: row.talent_full_name,
        hourly_rate: row.talent_hourly_rate,
        city: row.talent_city,
        user: {
          id: row.talent_user_id,
          username: row.talent_username,
          email: row.talent_email,
          phone_number: row.talent_phone_number
        }
      },
      skill: {
        id: row.skill_id,
        name: row.skill_name
      }
    }));

    return res.status(200).json(
      sendJson(true, 'Bookings retrieved successfully', {
        count: bookings.length,
        bookings
      })
    );
  } catch (error) {
    console.error('Booking list error:', error);
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