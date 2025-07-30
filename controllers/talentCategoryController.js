const { TalentCategory } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await TalentCategory.findAll({
      attributes: ['id', 'name', 'createdAt'],
      order: [['name', 'ASC']]
    });

    return res.status(200).json(
      sendJson(true, 'Categories retrieved successfully', {
        categories
      })
    );
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve categories', {
        error: err.message
      })
    );
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json(
        sendJson(false, 'Category name is required and must be a string')
      );
    }

    const category = await TalentCategory.create({ name });
    
    return res.status(201).json(
      sendJson(true, 'Category created successfully', {
        category: {
          id: category.id,
          name: category.name,
          createdAt: category.createdAt
        }
      })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'Category already exists')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to create category', {
        error: err.message
      })
    );
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json(
        sendJson(false, 'Category name is required and must be a string')
      );
    }

    const category = await TalentCategory.findByPk(id);
    if (!category) {
      return res.status(404).json(
        sendJson(false, 'Category not found')
      );
    }

    await category.update({ name });
    return res.status(200).json(
      sendJson(true, 'Category updated successfully', {
        category: {
          id: category.id,
          name: category.name,
          updatedAt: category.updatedAt
        }
      })
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        sendJson(false, 'Category name already exists')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to update category', {
        error: err.message
      })
    );
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await TalentCategory.findByPk(id);
    
    if (!category) {
      return res.status(404).json(
        sendJson(false, 'Category not found')
      );
    }

    await category.destroy();
    return res.status(200).json(
      sendJson(true, 'Category deleted successfully')
    );
  } catch (err) {
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json(
        sendJson(false, 'Cannot delete category - it is being used by other records')
      );
    }
    return res.status(500).json(
      sendJson(false, 'Failed to delete category', {
        error: err.message
      })
    );
  }
};