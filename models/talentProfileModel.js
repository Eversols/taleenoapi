const db = require('../src/config/db');

// Create Talent Profile
exports.createTalentProfile = (data, callback) => {
    const sql = `
        INSERT INTO talent_profiles (user_id, main_categories, skills, experience_level, hourly_rate, currency, availability_per_week, about, admin_approved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, Object.values(data), callback);
};

// Get All Talent Profiles
exports.getAllTalentProfiles = (callback) => {
    const sql = 'SELECT * FROM talent_profiles';
    db.query(sql, callback);
};

// Get Talent Profile by ID
exports.getTalentProfileById = (id, callback) => {
    const sql = 'SELECT * FROM talent_profiles WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return callback(err);
        callback(null, result[0]);
    });
};

// Update Talent Profile
exports.updateTalentProfile = (id, data, callback) => {
    const sql = `
        UPDATE talent_profiles
        SET main_categories = ?, skills = ?, experience_level = ?, hourly_rate = ?, currency = ?, availability_per_week = ?, about = ?, admin_approved = ?
        WHERE id = ?
    `;
    db.query(sql, [...Object.values(data), id], callback);
};

// Delete Talent Profile
exports.deleteTalentProfile = (id, callback) => {
    const sql = 'DELETE FROM talent_profiles WHERE id = ?';
    db.query(sql, [id], callback);
};
