// File: controllers/talentCategoryController.js
const { TalentCategory } = require('../models');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await TalentCategory.findAll();
    res.status(200).json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await TalentCategory.create({ name });
    res.status(201).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await TalentCategory.findByPk(id);
    if (!category) return res.status(404).json({ success: false, message: 'Not found' });
    await category.update({ name });
    res.status(200).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await TalentCategory.findByPk(id);
    if (!category) return res.status(404).json({ success: false, message: 'Not found' });
    await category.destroy();
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};