const db = require('../src/config/db');

// Create Chat
exports.createChat = (data, callback) => {
    const sql = 'INSERT INTO chats SET ?';
    db.query(sql, data, callback);
};

// Get All Chats
exports.getAllChats = (callback) => {
    const sql = 'SELECT * FROM chats';
    db.query(sql, callback);
};

// Get Chat by ID
exports.getChatById = (id, callback) => {
    const sql = 'SELECT * FROM chats WHERE id = ?';
    db.query(sql, [id], callback);
};

// Get Chats Between Two Users
exports.getChatsBetweenUsers = (sender_id, receiver_id, callback) => {
    const sql = `
        SELECT * FROM chats 
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
    `;
    db.query(sql, [sender_id, receiver_id, receiver_id, sender_id], callback);
};

// Delete Chat
exports.deleteChat = (id, callback) => {
    const sql = 'DELETE FROM chats WHERE id = ?';
    db.query(sql, [id], callback);
};
