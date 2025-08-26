const { User, Skill ,sequelize} = require('../models');
const { sendJson } = require('../utils/helpers');
const { Op } = require('sequelize');
exports.getFeed = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL;

    const { username, talent_type, location, price_range, skill_id } = req.query;

    const userWhere = { role: 'talent' };
    if (username) userWhere.username = username;

    const talentWhere = {};
    if (talent_type) talentWhere.main_talent = talent_type;
    if (location) {
      const [cityPart, countryPart] = location.split(',').map(l => l.trim());
      if (cityPart) talentWhere.city = { [Op.like]: `%${cityPart}%` };
      if (countryPart) talentWhere.country = { [Op.like]: `%${countryPart}%` };
    }

    const users = await User.findAll({
      where: userWhere,
      include: [
        {
          association: 'talent',
          where: talentWhere,
          attributes: [
            'id',
            'full_name',
            'city',
            'country',
            'profile_photo',
            'video_url',
            'main_talent',
            'skills',
            // ✅ Like counts
            [
              sequelize.literal(`(
                SELECT COUNT(*) 
                FROM likes l 
                WHERE l.talent_id = talent.id AND l.type = 'like'
              )`),
              'likes_count'
            ],
            // ✅ Unlike counts
            [
              sequelize.literal(`(
                SELECT COUNT(*) 
                FROM likes l 
                WHERE l.talent_id = talent.id AND l.type = 'unlike'
              )`),
              'unlikes_count'
            ],
            // ✅ Logged-in user’s reaction
            [
              sequelize.literal(`(
                SELECT type 
                FROM likes l 
                WHERE l.talent_id = talent.id 
                  AND l.user_id = ${req.user?.id || 0}
                LIMIT 1
              )`),
              'my_reaction'
            ]
          ]
        }
      ]
    });

    const feed = [];

    for (const user of users) {
      let staticSkillRates = user.talent?.skills || [];

      // filter by skill
      if (skill_id) {
        staticSkillRates = staticSkillRates.filter(sr => sr.id == skill_id);
        if (staticSkillRates.length === 0) continue;
      }

      // filter by price range
      if (price_range) {
        const [minPrice, maxPrice] = price_range.split('-').map(Number);
        staticSkillRates = staticSkillRates.filter(sr => {
          const rate = Number(sr.rate);
          return rate >= minPrice && rate <= maxPrice;
        });
        if (staticSkillRates.length === 0) continue;
      }

      // Fetch skill names
      const skillIds = staticSkillRates.map(sr => sr.id);
      const skillsFromDB = await Skill.findAll({
        where: { id: skillIds },
        attributes: ['id', 'name']
      });

      const skillsWithRate = staticSkillRates.map(sr => {
        const match = skillsFromDB.find(s => s.id === sr.id);
        return {
          id: sr.id,
          name: match ? match.name : null,
          rate: sr.rate
        };
      });

      feed.push({
        id: user.id,
        username: user.username,
        full_name: user.talent?.full_name || null,
        talent_type: user.talent?.main_talent || null,
        location: `${user.talent?.city || ''}, ${user.talent?.country || ''}`,
        city: user.talent?.city || null,
        country: user.talent?.country || null,
        profile_photo: user.talent?.profile_photo ? `${BASE_URL}${user.talent.profile_photo}` : null,
        video_url: user.talent?.video_url || null,
        likes_count: user.talent?.getDataValue('likes_count') || 0,
        unlikes_count: user.talent?.getDataValue('unlikes_count') || 0,
        my_reaction: user.talent?.getDataValue('my_reaction') || null,
        rating: user.rating || 5.0,
        skills: skillsWithRate
      });
    }

    return res.status(200).json(
      sendJson(true, 'Talent feed retrieved successfully', { feed })
    );

  } catch (error) {
    console.error('Feed Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve talent feed', { error: error.message })
    );
  }
};

