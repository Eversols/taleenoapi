const { City } = require('../models');

exports.create = async (req, res) => {
  try {
    const city = await City.create(req.body);
    res.status(201).json({ success: true, city });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const cities = await City.findAll({
      where: { country_id: 34 }
    });
    res.status(200).json({ success: true, cities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findByPk(id);
    if (!city) return res.status(404).json({ message: 'Not found' });

    await city.update(req.body);
    res.status(200).json({ success: true, city });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findByPk(id);
    if (!city) return res.status(404).json({ message: 'Not found' });

    await city.destroy();
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
