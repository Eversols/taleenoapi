const { City ,Country} = require('../models');
const { sendJson } = require('../utils/helpers');

exports.create = async (req, res) => {
  try {
    const { name, country_id } = req.body;
    
    if (!name || !country_id) {
      return res.status(400).json(
        sendJson(false, 'City name and country ID are required')
      );
    }

    const city = await City.create({ name, country_id });
    return res.status(201).json(
      sendJson(true, 'City created successfully', { city })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'City already exists in this country')
      );
    }
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json(
        sendJson(false, 'Invalid country ID')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to create city', {
        error: err.message
      })
    );
  }
};

exports.getAll = async (req, res) => {
  try {
    const { country_id } = req.query;
    
    // Build the query conditions
    const queryOptions = {
      attributes: ['id', 'name', 'country_id'],
      order: [['name', 'ASC']],
      include: [{
        model: Country,
        as: 'country',
        attributes: ['name']
      }]
    };

    // Only add where clause if country_id is provided
    if (country_id) {
      queryOptions.where = { country_id };
    }

    const cities = await City.findAll(queryOptions);
    
    // Prepare response data
    const responseData = {
      count: cities.length,
      cities
    };

    // Add country_id to response if filtering was applied
    if (country_id) {
      responseData.filter = { country_id };
    }

    return res.status(200).json(
      sendJson(true, 'Cities retrieved successfully', responseData)
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve cities', {
        error: err.message
      })
    );
  }
};

exports.AdmingetAll = async (req, res) => {
  try {
    const { country_id } = req.query;
    
    // Build the query conditions
    const queryOptions = {
      attributes: ['id', 'name', 'country_id','createdAt','updatedAt'],
      order: [['name', 'ASC']],
      include: [{
        model: Country,
        as: 'country',
        attributes: ['name']
      }]
    };

    // Only add where clause if country_id is provided
    if (country_id) {
      queryOptions.where = { country_id };
    }

    const cities = await City.findAll(queryOptions);
    
    // Prepare response data
    const responseData = {
      count: cities.length,
      cities
    };

    // Add country_id to response if filtering was applied
    if (country_id) {
      responseData.filter = { country_id };
    }

    return res.status(200).json(
      sendJson(true, 'Cities retrieved successfully', responseData)
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve cities', {
        error: err.message
      })
    );
  }
};
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json(
        sendJson(false, 'City name is required')
      );
    }

    const city = await City.findByPk(id);
    if (!city) {
      return res.status(404).json(
        sendJson(false, 'City not found')
      );
    }

    await city.update({ name });
    return res.status(200).json(
      sendJson(true, 'City updated successfully', { city })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'City with this name already exists in the country')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to update city', {
        error: err.message
      })
    );
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findByPk(id);
    
    if (!city) {
      return res.status(404).json(
        sendJson(false, 'City not found')
      );
    }

    await city.destroy();
    return res.status(200).json(
      sendJson(true, 'City deleted successfully')
    );
  } catch (err) {
    return res.status(500).json(
      sendJson(false, 'Failed to delete city', {
        error: err.message
      })
    );
  }
};