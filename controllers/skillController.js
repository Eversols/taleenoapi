const { Skill } = require('../models');

exports.create = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const { name } = req.body;
  try {
    const skill = await Skill.create({ name });
    res.status(201).json({ success: true, skill });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const skills = await Skill.findAll();
    res.status(200).json({ success: true, skills });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const { id } = req.params;
    const { name } = req.body;
    const skill = await Skill.findByPk(id);
    if (!skill) return res.status(404).json({ message: 'Not found' });

    await skill.update({ name });
    res.status(200).json({ success: true, skill });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const { id } = req.params;
    const skill = await Skill.findByPk(id);
    if (!skill) return res.status(404).json({ message: 'Not found' });

    await skill.destroy();
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
