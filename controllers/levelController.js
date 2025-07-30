const { Level } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.getAll = async (req, res) => {
  try {
    const levels = await Level.findAll({
      attributes: ['id', 'name', 'description', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json(
      sendJson(true, 'Levels retrieved successfully', {
        levels
      })
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve levels', {
        error: err.message
      })
    );
  }
};

exports.getOne = async (req, res) => {
  try {
    const level = await Level.findByPk(req.params.id, {
      attributes: ['id', 'name', 'description', 'createdAt', 'updatedAt']
    });

    if (!level) {
      return res.status(404).json(
        sendJson(false, 'Level not found')
      );
    }

    return res.status(200).json(
      sendJson(true, 'Level retrieved successfully', {
        level
      })
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve level', {
        error: err.message
      })
    );
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json(
        sendJson(false, 'Level name is required')
      );
    }

    const level = await Level.create({ name, description });

    return res.status(201).json(
      sendJson(true, 'Level created successfully', {
        level: {
          id: level.id,
          name: level.name,
          description: level.description,
          createdAt: level.createdAt
        }
      })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'Level with this name already exists')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to create level', {
        error: err.message
      })
    );
  }
};

exports.update = async (req, res) => {
  try {
    const level = await Level.findByPk(req.params.id);

    if (!level) {
      return res.status(404).json(
        sendJson(false, 'Level not found')
      );
    }

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json(
        sendJson(false, 'Level name is required')
      );
    }

    await level.update({ name, description });

    return res.status(200).json(
      sendJson(true, 'Level updated successfully', {
        level: {
          id: level.id,
          name: level.name,
          description: level.description,
          updatedAt: level.updatedAt
        }
      })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'Level with this name already exists')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to update level', {
        error: err.message
      })
    );
  }
};

exports.delete = async (req, res) => {
  try {
    const level = await Level.findByPk(req.params.id);

    if (!level) {
      return res.status(404).json(
        sendJson(false, 'Level not found')
      );
    }

    await level.destroy();
    return res.status(200).json(
      sendJson(true, 'Level deleted successfully')
    );
  } catch (err) {
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json(
        sendJson(false, 'Cannot delete level - it is being used by other records')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to delete level', {
        error: err.message
      })
    );
  }
};