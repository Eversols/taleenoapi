const db = require('../src/config/db');

// Create Project
exports.createProject = (data, callback) => {
    const sql = 'INSERT INTO projects SET ?';
    db.query(sql, data, callback);
};

// Get All Projects
exports.getAllProjects = (callback) => {
    const sql = 'SELECT * FROM projects';
    db.query(sql, callback);
};

// Get Project by ID
exports.getProjectById = (id, callback) => {
    const sql = 'SELECT * FROM projects WHERE id = ?';
    db.query(sql, [id], callback);
};

// Update Project
exports.updateProject = (id, data, callback) => {
    const sql = 'UPDATE projects SET ? WHERE id = ?';
    db.query(sql, [data, id], callback);
};

// Delete Project
exports.deleteProject = (id, callback) => {
    const sql = 'DELETE FROM projects WHERE id = ?';
    db.query(sql, [id], callback);
};
