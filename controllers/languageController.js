const { Language } = require('../models');

// Create
exports.create = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const { name } = req.body;
  try {
    const language = await Language.create({ name });
    res.status(201).json({ success: true, language });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Read All
exports.getAll = async (req, res) => {
  try {
    const languages = await Language.findAll();
    res.status(200).json({ success: true, languages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update
exports.update = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const { id } = req.params;
    const { name } = req.body;
    const language = await Language.findByPk(id);
    if (!language) return res.status(404).json({ message: 'Not found' });

    await language.update({ name });
    res.status(200).json({ success: true, language });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete
exports.remove = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const { id } = req.params;
    const language = await Language.findByPk(id);
    if (!language) return res.status(404).json({ message: 'Not found' });

    await language.destroy();
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
