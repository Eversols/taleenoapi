const Joi = require('joi');
const reviewModel = require('../models/reviewModel');

// Joi Validation Schema
const reviewSchema = Joi.object({
    reviewer_id: Joi.number().integer().required(),
    reviewee_id: Joi.number().integer().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().optional(),
    is_verified: Joi.boolean().optional(),
});

// Create Review
exports.createReview = (req, res) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const data = req.body;

    reviewModel.createReview(data, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(201).json({ message: 'Review created successfully!', id: result.insertId });
    });
};

// Get All Reviews
exports.getAllReviews = (req, res) => {
    reviewModel.getAllReviews((err, reviews) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json(reviews);
    });
};

// Get Review by ID
exports.getReviewById = (req, res) => {
    const idSchema = Joi.object({ id: Joi.number().integer().required() });
    const { error } = idSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;

    reviewModel.getReviewById(id, (err, review) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        if (!review) return res.status(404).json({ message: 'Review not found.' });
        res.status(200).json(review);
    });
};

// Update Review
exports.updateReview = (req, res) => {
    const idSchema = Joi.object({ id: Joi.number().integer().required() });
    const { error: idError } = idSchema.validate(req.params);
    if (idError) {
        return res.status(400).json({ message: 'Validation error.', details: idError.details });
    }

    const { error } = reviewSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;
    const data = req.body;

    reviewModel.updateReview(id, data, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Review updated successfully!' });
    });
};

// Delete Review
exports.deleteReview = (req, res) => {
    const idSchema = Joi.object({ id: Joi.number().integer().required() });
    const { error } = idSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;

    reviewModel.deleteReview(id, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Review deleted successfully!' });
    });
};
