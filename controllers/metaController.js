// controllers/metaController.js
const { Skill, Level, TalentCategory, Language } = require('../models');

exports.getMetaData = async (req, res) => {
  try {
    const [skills, levels, talentCategories, languages] = await Promise.all([
      Skill.findAll({ attributes: ['id', 'name'] }),
      Level.findAll({ attributes: ['id', 'name'] }),
      TalentCategory.findAll({ attributes: ['id', 'name'] }),
      Language.findAll({ attributes: ['id', 'name'] })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        skills,
        levels,
        talentCategories,
        languages
      }
    });
  } catch (error) {
    console.error('Meta Data Fetch Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch meta data',
      error: error.message
    });
  }
};
