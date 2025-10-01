const { Skill } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.create = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json(
      sendJson(false, 'Forbidden: Admin access required')
    );
  }

  const { name } = req.body;
  try {
    const skill = await Skill.create({ name });
    return res.status(201).json(
      sendJson(true, 'Skill created successfully', { skill })
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: err.message
      })
    );
  }
};

exports.getAll = async (req, res) => {
  try {
    const skills = await Skill.findAll();
    return res.status(200).json(
      sendJson(true, 'Skills retrieved successfully', { skills })
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: err.message
      })
    );
  }
};

exports.adminAll = async (req, res) => {
  try {
  if (req.user.role !== 'admin') {
    return res.status(403).json(
      sendJson(false, 'Forbidden: Admin access required')
    );
  }
    const skills = await Skill.findAll();
    return res.status(200).json(
      sendJson(true, 'Skills retrieved successfully', { skills })
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: err.message
      })
    );
  }
};

exports.update = async (req, res) => {
   if (req.user.role !== 'admin') {
    return res.status(403).json(
      sendJson(false, 'Forbidden: Admin access required')
    );
  }

  try {
    const { id } = req.params;
    const { name } = req.body;
    const skill = await Skill.findByPk(id);
    
    if (!skill) {
      return res.status(404).json(
        sendJson(false, 'Skill not found')
      );
    }

    await skill.update({ name });
    return res.status(200).json(
      sendJson(true, 'Skill updated successfully', { skill })
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: err.message
      })
    );
  }
};

exports.remove = async (req, res) => {
    if (req.user.role !== 'admin') {
    return res.status(403).json(
      sendJson(false, 'Forbidden: Admin access required')
    );
  }

  try {
    const { id } = req.params;
    const skill = await Skill.findByPk(id);
    
    if (!skill) {
      return res.status(404).json(
        sendJson(false, 'Skill not found')
      );
    }

    await skill.destroy();
    return res.status(200).json(
      sendJson(true, 'Skill deleted successfully')
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: err.message
      })
    );
  }
};