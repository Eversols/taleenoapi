const { Language } = require('../models');
const { sendJson } = require('../utils/helpers');

// Create (Admin only)
exports.create = async (req, res) => {
  const { name } = req.body;
  
  try {
    // Validate input
    if (!name || typeof name !== 'string') {
      return res.status(400).json(
        sendJson(false, 'Language name is required and must be a string')
      );
    }

    const language = await Language.create({ name });
    return res.status(201).json(
      sendJson(true, 'Language created successfully', { language })
    );
  } catch (err) {
    // Handle duplicate entry
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'Language already exists')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: err.message
      })
    );
  }
};

// Read All (Public)
exports.getAll = async (req, res) => {
  try {
    const languages = await Language.findAll({
      attributes: ['id', 'name'], // Only return necessary fields
      order: [['name', 'ASC']]   // Alphabetical order
    });
    
    return res.status(200).json(
      sendJson(true, 'Languages retrieved successfully', { 
        languages 
      })
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve languages', {
        error: err.message
      })
    );
  }
};

// Update (Admin only)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json(
        sendJson(false, 'Language name is required')
      );
    }

    const language = await Language.findByPk(id);
    if (!language) {
      return res.status(404).json(
        sendJson(false, 'Language not found')
      );
    }

    await language.update({ name });
    return res.status(200).json(
      sendJson(true, 'Language updated successfully', { language })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'Language name already exists')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to update language', {
        error: err.message
      })
    );
  }
};

// Delete (Admin only)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const language = await Language.findByPk(id);
    
    if (!language) {
      return res.status(404).json(
        sendJson(false, 'Language not found')
      );
    }

    await language.destroy();
    return res.status(200).json(
      sendJson(true, 'Language deleted successfully')
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to delete language', {
        error: err.message
      })
    );
  }
};