const { Country } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.create = async (req, res) => {
  try {
    const { name, code } = req.body;
    
    if (!name || !code) {
      return res.status(400).json(
        sendJson(false, 'Country name and code are required')
      );
    }

    const country = await Country.create({ name, code });
    return res.status(201).json(
      sendJson(true, 'Country created successfully', { country })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'Country already exists')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to create country', {
        error: err.message
      })
    );
  }
};

exports.getAll = async (req, res) => {
  try {
    const countries = await Country.findAll({
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });
    // Move Saudi Arabia (id = 194) to top
    const priorityId = 194;

    const sortedCountries = [
      ...countries.filter(c => c.id === priorityId),
      ...countries.filter(c => c.id !== priorityId)
    ];

    return res.status(200).json(
      sendJson(true, 'Countries retrieved successfully', {
        count: sortedCountries.length,
        countries: sortedCountries
      })
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve countries', {
        error: err.message
      })
    );
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json(
        sendJson(false, 'Country name and code are required')
      );
    }

    const country = await Country.findByPk(id);
    if (!country) {
      return res.status(404).json(
        sendJson(false, 'Country not found')
      );
    }

    await country.update({ name, code });
    return res.status(200).json(
      sendJson(true, 'Country updated successfully', { country })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'Country with this name or code already exists')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to update country', {
        error: err.message
      })
    );
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await Country.findByPk(id);
    
    if (!country) {
      return res.status(404).json(
        sendJson(false, 'Country not found')
      );
    }

    await country.destroy();
    return res.status(200).json(
      sendJson(true, 'Country deleted successfully')
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to delete country', {
        error: err.message
      })
    );
  }
};