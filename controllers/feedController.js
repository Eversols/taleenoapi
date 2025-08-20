const { User, Skill } = require('../models');
const { sendJson } = require('../utils/helpers');
exports.getFeed = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL;

    const { username, talent_type, location, price_range, skill_id } = req.query;

    const userWhere = { role: 'talent' };
    if (username) userWhere.username = username;

    const talentWhere = {};
    if (talent_type) talentWhere.main_talent = talent_type;
    if (location) {
      const [city, country] = location.split(',').map(l => l.trim());
      if (city) talentWhere.city = city;
      if (country) talentWhere.country = country;
    }

    const users = await User.findAll({
      where: userWhere,
      include: [
        {
          association: 'talent',
          where: talentWhere,
          attributes: ['id', 'full_name', 'city', 'country', 'profile_photo', 'video_url', 'main_talent', 'skills']
        },
        { association: 'reviewsReceived', attributes: [] },
        { association: 'sentMessages', attributes: [] }
      ]
    });

    const feed = [];

    for (const user of users) {
      let staticSkillRates = user.talent?.skills || [];

      // Filter by skill_id if provided
      if (skill_id) {
        staticSkillRates = staticSkillRates.filter(sr => sr.id == skill_id);
        if (staticSkillRates.length === 0) continue; // skip if skill not found
      }

      // Filter by price_range (rate) if provided
      if (price_range) {
        const [minPrice, maxPrice] = price_range.split('-').map(Number);
        staticSkillRates = staticSkillRates.filter(sr => {
          const rate = Number(sr.rate);
          return rate >= minPrice && rate <= maxPrice;
        });
        if (staticSkillRates.length === 0) continue; // skip if no skill in range
      }

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
        talent_type: user.talent?.main_talent || null,
        location: `${user.talent?.city || ''}, ${user.talent?.country || ''}`,
        city: user.talent?.city || null,
        country: user.talent?.country || null,
        profile_photo: user.talent?.profile_photo ? `${BASE_URL}${user.talent.profile_photo}` : null,
        video_url: user.talent?.video_url || null,
        main_talent: user.talent?.main_talent || null,
        full_name: user.talent?.full_name || null,
        likes: user.likes?.count || 0,
        comments: user.comments?.count || 0,
        messages: user.messages?.count || 0,
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

