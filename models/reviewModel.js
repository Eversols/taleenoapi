const db = require('../src/config/db');

// Create Review
exports.createReview = (data, callback) => {
    const sql = 'INSERT INTO reviews SET ?';
    db.query(sql, data, callback);
};

// Get All Reviews
exports.getAllReviews = (callback) => {
    const sql = 'SELECT * FROM reviews';
    db.query(sql, callback);
};

// Get Review by ID
exports.getReviewById = (id, callback) => {
    const sql = 'SELECT * FROM reviews WHERE id = ?';
    db.query(sql, [id], callback);
};

// Update Review
exports.updateReview = (id, data, callback) => {
    const sql = 'UPDATE reviews SET ? WHERE id = ?';
    db.query(sql, [data, id], callback);
};

// Delete Review
exports.deleteReview = (id, callback) => {
    const sql = 'DELETE FROM reviews WHERE id = ?';
    db.query(sql, [id], callback);
};
