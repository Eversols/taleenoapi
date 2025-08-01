const { Skill, Level, TalentCategory, Language } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.getMetaData = async (req, res) => {
  try {
    const [skills, levels, talentCategories, languages] = await Promise.all([
      Skill.findAll({ 
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      }),
      Level.findAll({
        attributes: ['id', 'name', 'description'],
        order: [['name', 'ASC']]
      }),
      TalentCategory.findAll({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      }),
      Language.findAll({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      })
    ]);

    return res.status(200).json(
      sendJson(true, 'Meta data retrieved successfully', {skills,
        levels,
        talentCategories,
        languages
      })
    );
  } catch (error) {
    console.error('Meta Data Fetch Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to fetch meta data', {
        error: error.message
      })
    );
  }
};