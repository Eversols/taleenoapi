const { Country } = require('../models');

exports.create = async (req, res) => {
  try {
    const { name, code } = req.body;
    const country = await Country.create({ name, code });
    res.status(201).json({ success: true, country });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const countries = await Country.findAll();
    res.status(200).json({ success: true, countries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const country = await Country.findByPk(id);
    if (!country) return res.status(404).json({ message: 'Not found' });

    await country.update({ name, code });
    res.status(200).json({ success: true, country });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await Country.findByPk(id);
    if (!country) return res.status(404).json({ message: 'Not found' });

    await country.destroy();
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
