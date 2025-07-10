const Joi = require('joi');
const bookingModel = require('../models/bookingModel');

// Validation Schema
const bookingSchema = Joi.object({
    client_id: Joi.number().integer().required(),
    talent_id: Joi.number().integer().required(),
    date: Joi.date().iso().required(),
    time_slot: Joi.string().required(),
    status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').optional(),
});

// Create Booking
exports.createBooking = (req, res) => {
    const { error } = bookingSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { client_id, talent_id, date, time_slot, status } = req.body;
    const data = { client_id, talent_id, date, time_slot, status: status || 'pending' };

    // Check for duplicate booking (custom logic)
    bookingModel.checkDuplicateBooking(data, (err, existingBooking) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        if (existingBooking.length > 0) {
            return res.status(409).json({ message: 'Duplicate booking already exists.' });
        }

        bookingModel.createBooking(data, (err, result) => {
            if (err) return res.status(500).json({ message: 'Database error.', error: err });
            res.status(201).json({ message: 'Booking created successfully!', id: result.insertId });
        });
    });
};

// Get All Bookings
exports.getAllBookings = (req, res) => {
    bookingModel.getAllBookings((err, bookings) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json(bookings);
    });
};

// Get Booking by ID
exports.getBookingById = (req, res) => {
    const idSchema = Joi.object({
        id: Joi.number().integer().required(),
    });

    const { error } = idSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;

    bookingModel.getBookingById(id, (err, booking) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        res.status(200).json(booking);
    });
};

// Update Booking
exports.updateBooking = (req, res) => {
    const { id } = req.params;

    const idSchema = Joi.object({
        id: Joi.number().integer().required(),
    });
    const { error: idError } = idSchema.validate(req.params);
    if (idError) {
        return res.status(400).json({ message: 'Validation error.', details: idError.details });
    }

    const { error } = bookingSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { date, time_slot, status } = req.body;
    const data = { date, time_slot, status };

    bookingModel.updateBooking(id, data, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Booking updated successfully!' });
    });
};

// Delete Booking
exports.deleteBooking = (req, res) => {
    const idSchema = Joi.object({
        id: Joi.number().integer().required(),
    });

    const { error } = idSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;

    bookingModel.deleteBooking(id, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Booking deleted successfully!' });
    });
};
