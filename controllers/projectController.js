const Joi = require('joi');
const projectModel = require('../models/projectModel');

// Joi Validation Schema
const projectSchema = Joi.object({
    talent_id: Joi.number().integer().required(),
    logo: Joi.string().uri().optional(),
    work_title: Joi.string().max(255).required(),
    client_name: Joi.string().max(255).optional(),
    total_hours: Joi.number().precision(2).optional(),
    description: Joi.string().optional(),
});

// Create Project
exports.createProject = (req, res) => {
    // Validate Request Body
    const { error } = projectSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const data = req.body;

    projectModel.createProject(data, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(201).json({ message: 'Project created successfully!', id: result.insertId });
    });
};

// Get All Projects
exports.getAllProjects = (req, res) => {
    projectModel.getAllProjects((err, projects) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json(projects);
    });
};

// Get Project by ID
exports.getProjectById = (req, res) => {
    const idSchema = Joi.object({ id: Joi.number().integer().required() });
    const { error } = idSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;

    projectModel.getProjectById(id, (err, project) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        if (!project) return res.status(404).json({ message: 'Project not found.' });
        res.status(200).json(project);
    });
};

// Update Project
exports.updateProject = (req, res) => {
    const idSchema = Joi.object({ id: Joi.number().integer().required() });
    const { error: idError } = idSchema.validate(req.params);
    if (idError) {
        return res.status(400).json({ message: 'Validation error.', details: idError.details });
    }

    const { error } = projectSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;
    const data = req.body;

    projectModel.updateProject(id, data, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Project updated successfully!' });
    });
};

// Delete Project
exports.deleteProject = (req, res) => {
    const idSchema = Joi.object({ id: Joi.number().integer().required() });
    const { error } = idSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;

    projectModel.deleteProject(id, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Project deleted successfully!' });
    });
};
