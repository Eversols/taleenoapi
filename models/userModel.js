const db = require('../src/config/db');

// Create a User
exports.createUser = (data, callback) => {
    const sql = `
        INSERT INTO users (full_name, username, email, password, role, gender, age, country, city)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, Object.values(data), callback);
};

// Get User by Email
exports.getUserByEmail = (email, callback) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, result) => {
        if (err) return callback(err);
        callback(null, result[0]);
    });
};
