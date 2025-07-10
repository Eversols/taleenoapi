const db = require('../src/config/db');

exports.createBooking = (data, callback) => {
    const sql = 'INSERT INTO bookings SET ?';
    db.query(sql, data, callback);
};

exports.getAllBookings = (callback) => {
    const sql = 'SELECT * FROM bookings';
    db.query(sql, callback);
};

exports.getBookingById = (id, callback) => {
    const sql = 'SELECT * FROM bookings WHERE id = ?';
    db.query(sql, [id], callback);
};

exports.updateBooking = (id, data, callback) => {
    const sql = 'UPDATE bookings SET ? WHERE id = ?';
    db.query(sql, [data, id], callback);
};

exports.deleteBooking = (id, callback) => {
    const sql = 'DELETE FROM bookings WHERE id = ?';
    db.query(sql, [id], callback);
};
