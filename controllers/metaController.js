const { Skill, Level, TalentCategory, Language, sequelize } = require('../models');
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

    // ✅ Fix: Join users table to check is_blocked
    const [rateRangeResult] = await sequelize.query(`
      SELECT 
        MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(js.value, '$.rate')) AS UNSIGNED)) AS min_rate,
        MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(js.value, '$.rate')) AS UNSIGNED)) AS max_rate
      FROM talents t
      JOIN users u ON u.id = t.user_id
      JOIN JSON_TABLE(t.skills, '$[*]' COLUMNS (
        value JSON PATH '$'
      )) AS js
      WHERE u.is_blocked = 0 AND u.role = 'talent'
    `);

    const rateRange = rateRangeResult[0] || { min_rate: null, max_rate: null };

    return res.status(200).json(
      sendJson(true, 'Meta data retrieved successfully', {
        skills,
        levels,
        talentCategories,
        languages,
        rateRange
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