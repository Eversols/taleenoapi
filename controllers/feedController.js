const { User, Skill, Media, sequelize } = require('../models');
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

    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    // Get users with talent info
    const users = await User.findAll({
      where: userWhere,
      include: [
        {
          association: 'talent',
          where: talentWhere,
          attributes: [
            'id', 'full_name', 'city', 'country', 'profile_photo', 'video_url',
            'main_talent', 'skills',
            [sequelize.literal(`(
              SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'like'
            )`), 'likes_count'],
            [sequelize.literal(`(
              SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'unlike'
            )`), 'unlikes_count'],
            [sequelize.literal(`(
              SELECT type FROM likes l WHERE l.talent_id = talent.id 
              ${req.user ? `AND l.user_id = ${req.user.id}` : ``} LIMIT 1
            )`), 'reaction'],
            [sequelize.literal(`(
              SELECT COUNT(*) FROM bookings b WHERE b.talent_id = talent.id
            )`), 'total_bookings'],
            [sequelize.literal(`(
              SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id
              ${req.user ? `AND w.user_id = ${req.user.id}` : ``}
            )`), 'is_wishlisted'],
            [sequelize.literal(`(
              SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id
            )`), 'wishlist_count']
          ]
        }
      ]
    });

    const feed = [];

    for (const user of users) {
      let talentSkills = user.talent?.skills || [];

      // Filter by skill
      if (skill_id) {
        talentSkills = talentSkills.filter(s => s.id == skill_id);
        if (!talentSkills.length) continue;
      }

      // Filter by price
      if (price_range) {
        const [minPrice, maxPrice] = price_range.split('-').map(Number);
        talentSkills = talentSkills.filter(s => Number(s.rate) >= minPrice && Number(s.rate) <= maxPrice);
        if (!talentSkills.length) continue;
      }

      const skillIds = talentSkills.map(s => s.id);

      const mediaItems = await Media.findAll({
        where: { skill_id: { [Op.in]: skillIds } }
      });

      mediaItems.forEach(media => {
        if (media.fileUrl && !media.fileUrl.startsWith('http')) {
          media.fileUrl = `${BASE_URL}${media.fileUrl}`;
        }

        const skill = user.talent?.skills.find(s => s.id === media.skill_id);
        if (skill) {
          media.skill_id = skill.id;
          media.skill_rate = skill.rate;
        }

        // Prepare skills array with name + rate
        const talentSkillsWithNames = (user.talent?.skills || []).map(s => ({
          id: s.id,
          name: skillsMap[s.id] || null,
          rate: s.rate
        }));
        const jobs = user.talent?.getDataValue('total_bookings') || 0;
        const MAX_JOBS = 20; // adjust threshold
        const ratinginnumber = Math.min(5, (jobs / MAX_JOBS) * 5);

        feed.push({
          ...media.toJSON(),
          TalentRate: skill?.rate ? Number(skill.rate) : null,
          talent: {
            id: user.id,
            user_id: user.id,
            talent_id: user.talent?.id || null,
            username: user.username,
            full_name: user.talent?.full_name || null,
            talent_type: user.talent?.main_talent || null,
            location: `${user.talent?.city || ''}, ${user.talent?.country || ''}`,
            city: user.talent?.city || null,
            country: user.talent?.country || null,
            profile_photo: user.talent?.profile_photo ? `${BASE_URL}${user.talent.profile_photo}` : null,
            video_url: user.talent?.video_url || null,
            jobs,        // total bookings count
            rating: user.rating || 5,
            ratinginnumber,      // ⭐ rating out of 5
            likes_count: user.talent?.getDataValue('likes_count') || 0,
            unlikes_count: user.talent?.getDataValue('unlikes_count') || 0,
            reaction: user.talent?.getDataValue('reaction') || null,
            is_liked: user.talent?.getDataValue('reaction') === 'like',
            is_unliked: user.talent?.getDataValue('reaction') === 'unlike',
            views: user.views || 0,
            talentSkills: talentSkillsWithNames,
            is_wishlisted: !!user.talent?.getDataValue('is_wishlisted'),
            wishlist_count: user.talent?.getDataValue('wishlist_count') || 0
          }
        });
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

// .

exports.OldgetFeed = async (req, res) => {
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
            // Like counts
            [
              sequelize.literal(`(
                SELECT COUNT(*) 
                FROM likes l 
                WHERE l.talent_id = talent.id AND l.type = 'like'
              )`),
              'likes_count'
            ],
            // Unlike counts
            [
              sequelize.literal(`(
                SELECT COUNT(*) 
                FROM likes l 
                WHERE l.talent_id = talent.id AND l.type = 'unlike'
              )`),
              'unlikes_count'
            ],
            // Current user reaction
            [
              sequelize.literal(`(
                SELECT type 
                FROM likes l 
                WHERE l.talent_id = talent.id 
                  ${req.user ? `AND l.user_id = ${req.user.id}` : ``}
                LIMIT 1
              )`),
              'reaction'
            ],
            [
              sequelize.literal(`(
                SELECT COUNT(*) 
                FROM bookings b
                INNER JOIN talents th ON th.id = b.talent_id
                WHERE b.talent_id = talent.id
              )`),
              'bookings_count'
            ],
            // ✅ Wishlist check
            [
              sequelize.literal(`(
                SELECT COUNT(*) 
                FROM Wishlists w
                WHERE w.talent_id = talent.id
                  ${req.user ? `AND w.user_id = ${req.user.id}` : ``}
              )`),
              'is_wishlisted'
            ],
            [
              sequelize.literal(`(
                SELECT COUNT(*) 
                FROM Wishlists w
                WHERE w.talent_id = talent.id
              )`),
              'wishlist_count'
            ]
          ]
        }
      ]
    });

    const feed = [];

    for (const user of users) {
      let staticSkillRates = user.talent?.skills || [];

      // Filter by skill
      if (skill_id) {
        staticSkillRates = staticSkillRates.filter(sr => sr.id == skill_id);
        if (staticSkillRates.length === 0) continue;
      }

      if (price_range) {
        const [minPrice, maxPrice] = price_range.split('-').map(Number);
        staticSkillRates = staticSkillRates.filter(sr => {
          const rate = Number(sr.rate);
          return rate >= minPrice && rate <= maxPrice;
        });
        if (staticSkillRates.length === 0) continue;
      }

      const skillIds = staticSkillRates.map(sr => sr.id);

      // Fetch all media for these skills in a single query
      const allMedia = await Media.findAll({
        where: {
          skill_id: {
            [Op.in]: skillIds  // Requires importing Op from sequelize
          }
        }
      });

      // Group media by skill_id
      const mediaBySkillId = {};
      allMedia.forEach(media => {
        // Only prepend BASE_URL if fileUrl exists and doesn't already start with http
        if (media.fileUrl && !media.fileUrl.startsWith('http')) {
          media.fileUrl = `${BASE_URL}${media.fileUrl}`;
        }
        
        if (!mediaBySkillId[media.skill_id]) {
          mediaBySkillId[media.skill_id] = [];
        }
        mediaBySkillId[media.skill_id].push(media);
      });

      // ✅ Fetch all skills into an array
      const skills = await Skill.findAll({
        where: {
          id: {
            [Op.in]: skillIds
          }
        }
      });

      // Create the final result
      const skillsWithRate = staticSkillRates.map(sr => {
        const match = skills.find(s => s.id === sr.id); // ✅ now using array
        return {
          id: sr.id,
          name: match ? match.name : null,
          rate: sr.rate,
          videos: mediaBySkillId[sr.id] || []
        };
      });

      feed.push({
        id: user.id,
        user_id: user.id,
        talent_id: user.talent?.id || null,
        username: user.username,
        full_name: user.talent?.full_name || null,
        talent_type: user.talent?.main_talent || null,
        location: `${user.talent?.city || ''}, ${user.talent?.country || ''}`,
        city: user.talent?.city || null,
        country: user.talent?.country || null,
        profile_photo: user.talent?.profile_photo ? `${BASE_URL}${user.talent.profile_photo}` : null,
        video_url: user.talent?.video_url || null,
        jobs: user.talent?.getDataValue('bookings_count') || 0,
        likes_count: user.talent?.getDataValue('likes_count') || 0,
        unlikes_count: user.talent?.getDataValue('unlikes_count') || 0,
        reaction: user.talent?.getDataValue('reaction') || null,
        is_liked: user.talent?.getDataValue('reaction') === 'like',
        is_unliked: user.talent?.getDataValue('reaction') === 'unlike',
        rating: user.rating || 5.0,
        skills: skillsWithRate,
        views: user.views || 0,
        // ✅ return wishlist status
        is_wishlisted: !!user.talent?.getDataValue('is_wishlisted'),
        wishlist_count: user.talent?.getDataValue('wishlist_count') || 0,
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
