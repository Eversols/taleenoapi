const { User, Skill, Media, Block, City, TalentAvailability,sequelize } = require('../models');
const { sendJson } = require('../utils/helpers');
const { Op } = require('sequelize');

exports.getFeed = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL;
    const { username, talent_type, location, price_range, skill_id, available_date, available_time } = req.query;

    const userWhere = { role: 'talent', is_blocked: 0 };
    const searchText = username?.trim();
    
    // Build searchWhere properly
    let searchWhere = {};
    if (searchText) {
      searchWhere = {
        [Op.or]: [
          { '$User.username$': { [Op.like]: `%${searchText}%` } },
          { '$User.talent.full_name$': { [Op.like]: `%${searchText}%` } }
        ]
      };
    }

    const talentWhere = {};
    if (talent_type) talentWhere.main_talent = talent_type;
    if (location) {
      const [cityPart, countryPart] = location.split(',').map(l => l.trim());
      if (cityPart) talentWhere.city = { [Op.like]: `%${cityPart}%` };
      if (countryPart) talentWhere.country = { [Op.like]: `%${countryPart}%` };
    }

    // ✅ Find blocked users (both directions)
    const blockedUsers = await Block.findAll({
      where: {
        [Op.or]: [
          { blocker_id: req.user.id },
          { blocked_id: req.user.id }
        ]
      }
    });

    const blockedIds = blockedUsers.map(b =>
      b.blocker_id === req.user.id ? b.blocked_id : b.blocker_id
    );

    // skills map
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    // ✅ Fetch all media first (your original approach)
    const mediaItems = await Media.findAll({
      where: {
        userId: { [Op.notIn]: blockedIds },
        ...(searchText ? searchWhere : {})
      },
      include: [
        {
          model: User,
          as: 'User',
          where: {
            role: 'talent',
            is_blocked: 0,
          },
          required: true,
          include: [
            {
              association: 'talent',
              where: talentWhere,
              required: false
            }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    // ✅ Also fetch users WITHOUT media
    const usersWithoutMedia = await User.findAll({
      where: {
        role: 'talent',
        is_blocked: 0,
        id: { [Op.notIn]: blockedIds }
      },
      include: [
        {
          association: 'talent',
          where: talentWhere,
          required: false,
          attributes: [
            "id", "full_name", "city", "country", "profile_photo", "video_url",
            "main_talent", "skills", "availability",
            [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'like')`), 'likes_count'],
            [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'unlike')`), 'unlikes_count'],
            [sequelize.literal(`(SELECT type FROM likes l WHERE l.talent_id = talent.id ${req.user ? `AND l.user_id = ${req.user.id}` : ``} LIMIT 1)`), 'reaction'],
            [sequelize.literal(`(SELECT COUNT(*) FROM bookings b WHERE b.talent_id = talent.id)`), 'total_bookings'],
            [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id ${req.user ? `AND w.user_id = ${req.user.id}` : ``})`), 'is_wishlisted'],
            [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id)`), 'wishlist_count'],
          ]
        },
        {
          model: Media,
          as: 'media',
          required: false,
          where: {
            id: null // Only get users with NO media
          }
        }
      ]
    });

    // Filter users that actually have no media
    const usersWithNoMedia = usersWithoutMedia.filter(user => {
      const hasMedia = mediaItems.some(media => media.userId === user.id);
      return !hasMedia;
    });

    const feed = [];

    // ✅ Process media items (your original logic)
    for (const media of mediaItems) {
      // If we have a search text, check if it matches in any field
      if (searchText) {
        const user = media.User;
        const usernameMatch = user.username && 
          user.username.toLowerCase().includes(searchText.toLowerCase());
        const fullNameMatch = user.talent && user.talent.full_name && 
          user.talent.full_name.toLowerCase().includes(searchText.toLowerCase());
        const titleMatch = media.title && 
          media.title.toLowerCase().includes(searchText.toLowerCase());
        
        // If no match, skip this media item
        if (!usernameMatch && !fullNameMatch && !titleMatch) {
          continue;
        }
      }

      const user = await User.findOne({
        where: {
          id: media.userId,
          role: 'talent',
          is_blocked: 0
        },
        include: [
          {
            association: 'talent',
            where: talentWhere,
            required: false,
            attributes: [
              "id", "full_name", "city", "country", "profile_photo", "video_url",
              "main_talent", "skills", "availability",
              [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'like')`), 'likes_count'],
              [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'unlike')`), 'unlikes_count'],
              [sequelize.literal(`(SELECT type FROM likes l WHERE l.talent_id = talent.id ${req.user ? `AND l.user_id = ${req.user.id}` : ``} LIMIT 1)`), 'reaction'],
              [sequelize.literal(`(SELECT COUNT(*) FROM bookings b WHERE b.talent_id = talent.id)`), 'total_bookings'],
              [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id ${req.user ? `AND w.user_id = ${req.user.id}` : ``})`), 'is_wishlisted'],
              [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id)`), 'wishlist_count'],
            ]
          }
        ]
      });

      if (!user || !user.talent) continue;
      if (!user.talent.availability) continue;
      if (blockedIds.includes(user.id)) continue;

      // ✅ AVAILABILITY FILTER (date, time, and price)
      if (available_date || available_time || price_range) {
        let isAvailable = false;
        try {
          const availData = JSON.parse(user.talent.availability);

          if (Array.isArray(availData)) {
            for (const slotObj of availData) {
              const matchDate = available_date ? slotObj.date === available_date : true;
              const matchTime = available_time
                ? slotObj.slot.includes(available_time.split('-')[0].trim())
                : true;
              const matchPrice = price_range
                ? (() => {
                    const [minPrice, maxPrice] = price_range.split('-').map(Number);
                    const price = Number(slotObj.price || 0);
                    return price >= minPrice && price <= maxPrice;
                  })()
                : true;

              if (matchDate && matchTime && matchPrice) {
                isAvailable = true;
                break;
              }
            }
          }
        } catch (e) {
          console.error('Availability parse error:', e.message);
        }

        if (!isAvailable) continue;
      }

      // continue existing filters (skills, price, etc.)
      let talentSkills = user.talent.skills || [];

      if (skill_id) {
        talentSkills = talentSkills.filter(s => s.id == skill_id);
        if (!talentSkills.length) continue;
      }
      
      if (price_range) {
        const [minPrice, maxPrice] = price_range.split('-').map(Number);
        talentSkills = talentSkills.filter(s => Number(s.rate) >= minPrice && Number(s.rate) <= maxPrice);
        if (!talentSkills.length) continue;
      }

      if (media.fileUrl && !media.fileUrl.startsWith('http')) {
        media.fileUrl = `${media.fileUrl}`;
      }

      const skill = talentSkills.find(s => s.id === media.skill_id);

      const talentSkillsWithNames = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate ? s.rate.toString() : '0'
      }));

      const likesCount = await sequelize.models.MediaLike.count({
        where: { media_id: media.id }
      });

      let isLiked = false;
      if (req.user) {
        const userLiked = await sequelize.models.MediaLike.findOne({
          where: { media_id: media.id, user_id: req.user.id }
        });
        isLiked = !!userLiked;
      }

      const jobs = user.talent?.getDataValue('total_bookings') || 0;
      const MAX_JOBS = 20;
      const ratinginnumber = Math.min(5, (jobs / MAX_JOBS) * 5);

      // Create a clean media object without the nested User
      const mediaData = media.toJSON();
      // Remove the nested User object from the response
      delete mediaData.User;
      
      feed.push({
        ...mediaData,
        TalentRate: skill?.rate ? Number(skill.rate) : null,
        likes_count: likesCount,
        is_liked: isLiked,
        talent: {
          id: user.id,
          user_id: user.id,
          talent_id: user.talent?.id || null,
          username: user.username,
          full_name: user.talent?.full_name || null,
          talent_type: user.talent?.main_talent || null,
          location: `${user.talent?.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null}, ${user.talent?.country || ''}`,
          city: user.talent?.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null,
          country: user.talent?.country || null,
          profile_photo: user.talent?.profile_photo ? `${user.talent.profile_photo}` : null,
          video_url: user.talent?.video_url || null,
          jobs,
          rating: user.rating || 0,
          ratinginnumber,
          likes_count: user.talent?.getDataValue('likes_count') || 0,
          unlikes_count: user.talent?.getDataValue('unlikes_count') || 0,
          reaction: user.talent?.getDataValue('reaction') || null,
          is_liked: user.talent?.getDataValue('reaction') === 'like',
          is_unliked: user.talent?.getDataValue('reaction') === 'unlike',
          views: user.views || 0,
          talentSkills: talentSkillsWithNames,
          is_wishlisted: !!user.talent?.getDataValue('is_wishlisted'),
          wishlist_count: user.talent?.getDataValue('wishlist_count') || 0,
          availability: user.availability
        }
      });
    }

    // ✅ Now add users without media
    for (const user of usersWithNoMedia) {
      if (!user.talent) continue;
      if (!user.talent.availability) continue;

      // Apply search filter
      if (searchText) {
        const usernameMatch = user.username && 
          user.username.toLowerCase().includes(searchText.toLowerCase());
        const fullNameMatch = user.talent && user.talent.full_name && 
          user.talent.full_name.toLowerCase().includes(searchText.toLowerCase());
        
        if (!usernameMatch && !fullNameMatch) {
          continue;
        }
      }

      // Apply availability filter
      if (available_date || available_time || price_range) {
        let isAvailable = false;
        try {
          const availData = JSON.parse(user.talent.availability);

          if (Array.isArray(availData)) {
            for (const slotObj of availData) {
              const matchDate = available_date ? slotObj.date === available_date : true;
              const matchTime = available_time
                ? slotObj.slot.includes(available_time.split('-')[0].trim())
                : true;
              const matchPrice = price_range
                ? (() => {
                    const [minPrice, maxPrice] = price_range.split('-').map(Number);
                    const price = Number(slotObj.price || 0);
                    return price >= minPrice && price <= maxPrice;
                  })()
                : true;

              if (matchDate && matchTime && matchPrice) {
                isAvailable = true;
                break;
              }
            }
          }
        } catch (e) {
          console.error('Availability parse error:', e.message);
        }

        if (!isAvailable) continue;
      }

      // Apply skills filter
      let talentSkills = user.talent.skills || [];

      if (skill_id) {
        talentSkills = talentSkills.filter(s => s.id == skill_id);
        if (!talentSkills.length) continue;
      }
      
      if (price_range) {
        const [minPrice, maxPrice] = price_range.split('-').map(Number);
        talentSkills = talentSkills.filter(s => Number(s.rate) >= minPrice && Number(s.rate) <= maxPrice);
        if (!talentSkills.length) continue;
      }

      const talentSkillsWithNames = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate ? s.rate.toString() : '0'
      }));

      const jobs = user.talent?.getDataValue('total_bookings') || 0;
      const MAX_JOBS = 20;
      const ratinginnumber = Math.min(5, (jobs / MAX_JOBS) * 5);

      feed.push({
        id: null,
        userId: user.id,
        title: null,
        fileUrl: null,
        fileType: null,
        skill_id: null,
        TalentRate: null,
        likes_count: 0,
        is_liked: false,
        talent: {
          id: user.id,
          user_id: user.id,
          talent_id: user.talent?.id || null,
          username: user.username,
          full_name: user.talent?.full_name || null,
          talent_type: user.talent?.main_talent || null,
          location: `${user.talent?.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null}, ${user.talent?.country || ''}`,
          city: user.talent?.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null,
          country: user.talent?.country || null,
          profile_photo: user.talent?.profile_photo ? `${user.talent.profile_photo}` : null,
          video_url: user.talent?.video_url || null,
          jobs,
          rating: user.rating || 0,
          ratinginnumber,
          likes_count: user.talent?.getDataValue('likes_count') || 0,
          unlikes_count: user.talent?.getDataValue('unlikes_count') || 0,
          reaction: user.talent?.getDataValue('reaction') || null,
          is_liked: user.talent?.getDataValue('reaction') === 'like',
          is_unliked: user.talent?.getDataValue('reaction') === 'unlike',
          views: user.views || 0,
          talentSkills: talentSkillsWithNames,
          is_wishlisted: !!user.talent?.getDataValue('is_wishlisted'),
          wishlist_count: user.talent?.getDataValue('wishlist_count') || 0,
          availability: user.availability
        }
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

exports.AdminFeed = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL;
    const { username, talent_type, location, price_range, skill_id } = req.query;

    const userWhere = { role: 'talent', is_blocked: 0 };
    if (username) userWhere.username = username;

    const talentWhere = {};
    if (talent_type) talentWhere.main_talent = talent_type;
    if (location) {
      const [cityPart, countryPart] = location.split(',').map(l => l.trim());
      if (cityPart) talentWhere.city = { [Op.like]: `%${cityPart}%` };
      if (countryPart) talentWhere.country = { [Op.like]: `%${countryPart}%` };
    }

    // 🚀 Admin: no block restrictions
    const blockedIds = [];

    // skills map
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    // fetch all media (no block filtering)
    const mediaItems = await Media.findAll({
      order: [['id', 'DESC']]
    });

    const feed = [];

    for (const media of mediaItems) {
      const user = await User.findByPk(media.userId, {
        where: userWhere,
        include: [
          {
            association: 'talent',
            where: talentWhere,
            attributes: [
              'id', 'full_name', 'city', 'country', 'profile_photo', 'video_url',
              'main_talent', 'skills',
              [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'like')`), 'likes_count'],
              [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'unlike')`), 'unlikes_count'],
              [sequelize.literal(`(SELECT COUNT(*) FROM bookings b WHERE b.talent_id = talent.id)`), 'total_bookings'],
              [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id)`), 'is_wishlisted'],
              [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id)`), 'wishlist_count']
            ]
          }
        ]
      });

      if (!user || !user.talent) continue;
      if (!user.availability) continue;

      let talentSkills = user.talent.skills || [];

      if (skill_id) {
        talentSkills = talentSkills.filter(s => s.id == skill_id);
        if (!talentSkills.length) continue;
      }

      if (price_range) {
        const [minPrice, maxPrice] = price_range.split('-').map(Number);
        talentSkills = talentSkills.filter(s => Number(s.rate) >= minPrice && Number(s.rate) <= maxPrice);
        if (!talentSkills.length) continue;
      }

      if (media.fileUrl && !media.fileUrl.startsWith('http')) {
        media.fileUrl = `${media.fileUrl}`;
      }

      const skill = talentSkills.find(s => s.id === media.skill_id);

      const talentSkillsWithNames = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate
      }));

      const likesCount = await sequelize.models.MediaLike.count({
        where: { media_id: media.id }
      });

      // 🚀 Admin: no personal like check
      const isLiked = false;

      const jobs = user.talent?.getDataValue('total_bookings') || 0;
      const MAX_JOBS = 20;
      const ratinginnumber = Math.min(5, (jobs / MAX_JOBS) * 5);

      feed.push({
        ...media.toJSON(),
        TalentRate: skill?.rate ? Number(skill.rate) : null,
        likes_count: likesCount,
        is_liked: isLiked,
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
          profile_photo: user.talent?.profile_photo ? `${user.talent.profile_photo}` : null,
          video_url: user.talent?.video_url || null,
          jobs,
          rating: user.rating || 0,
          ratinginnumber,
          likes_count: user.talent?.getDataValue('likes_count') || 0,
          unlikes_count: user.talent?.getDataValue('unlikes_count') || 0,
          reaction: null, // 🚀 Admin sees neutral reaction
          is_liked: false,
          is_unliked: false,
          views: user.views || 0,
          talentSkills: talentSkillsWithNames,
          is_wishlisted: false,
          wishlist_count: user.talent?.getDataValue('wishlist_count') || 0,
          availability: user.availability
        }
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

exports.backupFeed = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL;
    const { username, talent_type, location, price_range, skill_id, available_date, available_time } = req.query;

    const userWhere = { role: 'talent', is_blocked: 0 };
    const searchText = username?.trim();
    // Build searchWhere properly
    let searchWhere = {};
    if (searchText) {
      searchWhere = {
        [Op.or]: [
          { '$User.username$': { [Op.like]: `%${searchText}%` } },
          { '$User.talent.full_name$': { [Op.like]: `%${searchText}%` } }
        ]
      };
    }

    const talentWhere = {};
    if (talent_type) talentWhere.main_talent = talent_type;
    if (location) {
      const [cityPart, countryPart] = location.split(',').map(l => l.trim());
      if (cityPart) talentWhere.city = { [Op.like]: `%${cityPart}%` };
      if (countryPart) talentWhere.country = { [Op.like]: `%${countryPart}%` };
    }

    // ✅ Find blocked users (both directions)
    const blockedUsers = await Block.findAll({
      where: {
        [Op.or]: [
          { blocker_id: req.user.id },
          { blocked_id: req.user.id }
        ]
      }
    });

    const blockedIds = blockedUsers.map(b =>
      b.blocker_id === req.user.id ? b.blocked_id : b.blocker_id
    );

    // skills map
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    // fetch all media first (skip blocked users)
    const mediaItems = await Media.findAll({
      where: {
        userId: { [Op.notIn]: blockedIds },
        ...(searchText ? searchWhere : {})
      },
      include: [
        {
          model: User,
          as: 'User',
          where: {
            role: 'talent',
            is_blocked: 0,
            // Remove username from userWhere since we're handling it in searchWhere
          },
          required: true,
          include: [
            {
              association: 'talent',
              where: talentWhere,
              required: false // Set to false to include users even without talent record
            }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    const feed = [];

    for (const media of mediaItems) {
      // If we have a search text, check if it matches in any field
      if (searchText) {
        const user = media.User;
        const usernameMatch = user.username && 
          user.username.toLowerCase().includes(searchText.toLowerCase());
        const fullNameMatch = user.talent && user.talent.full_name && 
          user.talent.full_name.toLowerCase().includes(searchText.toLowerCase());
        const titleMatch = media.title && 
          media.title.toLowerCase().includes(searchText.toLowerCase());
        
        // If no match, skip this media item
        if (!usernameMatch && !fullNameMatch && !titleMatch) {
          continue;
        }
      }
      const user = await User.findOne({
        where: {
          id: media.userId,
          role: 'talent',
          is_blocked: 0
        },
        include: [
          {
            association: 'talent',
            where: talentWhere,
            required: false,
            attributes: [
              "id", "full_name", "city", "country", "profile_photo", "video_url",
              "main_talent", "skills", "availability",
              [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'like')`), 'likes_count'],
              [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'unlike')`), 'unlikes_count'],
              [sequelize.literal(`(SELECT type FROM likes l WHERE l.talent_id = talent.id ${req.user ? `AND l.user_id = ${req.user.id}` : ``} LIMIT 1)`), 'reaction'],
              [sequelize.literal(`(SELECT COUNT(*) FROM bookings b WHERE b.talent_id = talent.id)`), 'total_bookings'],
              [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id ${req.user ? `AND w.user_id = ${req.user.id}` : ``})`), 'is_wishlisted'],
              [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id)`), 'wishlist_count'],
            ]
          }
        ]
      });


      if (!user || !user.talent) continue;
      if (!user.talent.availability) continue;
      if (blockedIds.includes(user.id)) continue;

      // ✅ NEW AVAILABILITY FILTER (date, time, and price)
      if (available_date || available_time || price_range) {
        let isAvailable = false;
        try {
          const availData = JSON.parse(user.talent.availability);

          if (Array.isArray(availData)) {
            for (const slotObj of availData) {
              const matchDate = available_date ? slotObj.date === available_date : true;
              const matchTime = available_time
                ? slotObj.slot.includes(available_time.split('-')[0].trim())
                : true;
              const matchPrice = price_range
                ? (() => {
                    const [minPrice, maxPrice] = price_range.split('-').map(Number);
                    const price = Number(slotObj.price || 0);
                    return price >= minPrice && price <= maxPrice;
                  })()
                : true;

              if (matchDate && matchTime && matchPrice) {
                isAvailable = true;
                break;
              }
            }
          }
        } catch (e) {
          console.error('Availability parse error:', e.message);
        }

        if (!isAvailable) continue;
      }

      // continue existing filters (skills, price, etc.)
      let talentSkills = user.talent.skills || [];

      if (skill_id) {
        talentSkills = talentSkills.filter(s => s.id == skill_id);
        if (!talentSkills.length) continue;
      }
      
      if (price_range) {
        const [minPrice, maxPrice] = price_range.split('-').map(Number);
        talentSkills = talentSkills.filter(s => Number(s.rate) >= minPrice && Number(s.rate) <= maxPrice);
        if (!talentSkills.length) continue;
      }

      if (media.fileUrl && !media.fileUrl.startsWith('http')) {
        media.fileUrl = `${media.fileUrl}`;
      }

      const skill = talentSkills.find(s => s.id === media.skill_id);

      const talentSkillsWithNames = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate.toString()
      }));
      const likesCount = await sequelize.models.MediaLike.count({
        where: { media_id: media.id }
      });

      let isLiked = false;
      if (req.user) {
        const userLiked = await sequelize.models.MediaLike.findOne({
          where: { media_id: media.id, user_id: req.user.id }
        });
        isLiked = !!userLiked;
      }
      const jobs = user.talent?.getDataValue('total_bookings') || 0;
      const MAX_JOBS = 20;
      const ratinginnumber = Math.min(5, (jobs / MAX_JOBS) * 5);
      // Create a clean media object without the nested User
      const mediaData = media.toJSON();
      // Remove the nested User object from the response
      delete mediaData.User;
      
      feed.push({
        ...mediaData,
        TalentRate: skill?.rate ? Number(skill.rate) : null,
        likes_count: likesCount,
        is_liked: isLiked,
        talent: {
          id: user.id,
          user_id: user.id,
          talent_id: user.talent?.id || null,
          username: user.username,
          full_name: user.talent?.full_name || null,
          talent_type: user.talent?.main_talent || null,
          location: `${user.talent?.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null}, ${user.talent?.country || ''}`,
          city: user.talent?.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null,
          country: user.talent?.country || null,
          profile_photo: user.talent?.profile_photo ? `${user.talent.profile_photo}` : null,
          video_url: user.talent?.video_url || null,
          jobs,
          rating: user.rating || 0,
          ratinginnumber,
          likes_count: user.talent?.getDataValue('likes_count') || 0,
          unlikes_count: user.talent?.getDataValue('unlikes_count') || 0,
          reaction: user.talent?.getDataValue('reaction') || null,
          is_liked: user.talent?.getDataValue('reaction') === 'like',
          is_unliked: user.talent?.getDataValue('reaction') === 'unlike',
          views: user.views || 0,
          talentSkills: talentSkillsWithNames,
          is_wishlisted: !!user.talent?.getDataValue('is_wishlisted'),
          wishlist_count: user.talent?.getDataValue('wishlist_count') || 0,
          availability: user.availability
        }
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
const normalizeSearchTime = (time) => {
  if (!time) return null;
  if (time.length === 5) return `${time}:00`;
  return time;
};

const isTalentAvailable = (availabilities, available_date, available_time, price_range) => {
  const searchTime = available_time
    ? normalizeSearchTime(available_time.split('-')[0].trim())
    : null;

  for (const a of availabilities) {
    const matchDate = available_date ? a.date === available_date : true;

    const matchTime = searchTime
      ? searchTime >= a.start_time && searchTime <= a.end_time
      : true;

    const matchPrice = price_range
      ? (() => {
          const [min, max] = price_range.split('-').map(Number);
          const price = Number(a.price || 0);
          return price >= min && price <= max;
        })()
      : true;

    if (matchDate && matchTime && matchPrice) {
      return true;
    }
  }

  return false;
};
const filterAvailabilitiesByDate = (availabilities, available_date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If user selected a date → only that date
  if (available_date) {
    return availabilities.filter(a => a.date === available_date);
  }

  // If NO date selected → allow only today & future
  return availabilities.filter(a => {
    const aDate = new Date(a.date);
    aDate.setHours(0, 0, 0, 0);
    return aDate >= today;
  });
};

exports.testingFeed = async (req, res) => {
  try {
    const {
      username,
      talent_type,
      location,
      price_range,
      skill_id,
      available_date,
      available_time
    } = req.query;

    const searchText = username?.trim();

    const talentWhere = {};
    if (talent_type) talentWhere.main_talent = talent_type;

    if (location) {
      const [cityPart, countryPart] = location.split(',').map(l => l.trim());
      if (cityPart) talentWhere.city = { [Op.like]: `%${cityPart}%` };
      if (countryPart) talentWhere.country = { [Op.like]: `%${countryPart}%` };
    }

    /* ---------------- BLOCKED USERS ---------------- */
    const blockedUsers = await Block.findAll({
      where: {
        [Op.or]: [
          { blocker_id: req.user.id },
          { blocked_id: req.user.id }
        ]
      }
    });

    const blockedIds = blockedUsers.map(b =>
      b.blocker_id === req.user.id ? b.blocked_id : b.blocker_id
    );

    /* ---------------- SKILLS MAP ---------------- */
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    /* ---------------- MEDIA ---------------- */
    const mediaItems = await Media.findAll({
      where: {
        userId: { [Op.notIn]: blockedIds }
      },
      include: [
        {
          model: User,
          as: 'User',
          where: { role: 'talent', is_blocked: 0 },
          include: [
            {
              association: 'talent',
              where: talentWhere,
              required: false
            }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    /* ---------------- USERS WITHOUT MEDIA ---------------- */
    const usersWithoutMedia = await User.findAll({
      where: {
        role: 'talent',
        is_blocked: 0,
        id: { [Op.notIn]: blockedIds }
      },
      include: [
        {
          association: 'talent',
          where: talentWhere,
          required: false
        }
      ]
    });

    const feed = [];

    /* ============================================================
       MEDIA USERS
    ============================================================ */
    for (const media of mediaItems) {
      const user = media.User;
      if (!user || !user.talent) continue;

      if (searchText) {
        const match =
          user.username?.toLowerCase().includes(searchText.toLowerCase()) ||
          user.talent.full_name?.toLowerCase().includes(searchText.toLowerCase())  

        if (!match) continue;
      }

      let availabilities = await TalentAvailability.findAll({
        where: { talent_id: user.talent.id },
        attributes: ['date', 'start_time', 'end_time', 'price', 'discount']
      });
      availabilities = filterAvailabilitiesByDate(availabilities, available_date);
      if (available_date || available_time || price_range) {
        if (!isTalentAvailable(availabilities, available_date, available_time, price_range)) {
          continue;
        }
      }

      let talentSkills = user.talent.skills || [];
      if (typeof talentSkills === 'string') {
        try {
          talentSkills = JSON.parse(talentSkills);
        } catch {
          talentSkills = [];
        }
      }

      if (skill_id) {
        const skillIdNum = Number(skill_id);
        talentSkills = talentSkills.filter(s => Number(s.id) === skillIdNum);
        if (!talentSkills.length) continue;
      }

      const talentSkillsWithNames = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate ? s.rate.toString() : '0'
      }));

      const jobs = 0;
      const ratinginnumber = Math.min(5, (jobs / 20) * 5);

      /* 🔴 ONLY CHANGE: REMOVE User FROM RESPONSE */
      const mediaJson = media.toJSON();
      delete mediaJson.User;

      feed.push({
        ...mediaJson,
        TalentRate: talentSkills[0]?.rate ? Number(talentSkills[0].rate) : null,
        likes_count: 0,
        is_liked: false,
        talent: {
          id: user.id,
          user_id: user.id,
          talent_id: user.talent.id,
          username: user.username,
          full_name: user.talent.full_name,
          talent_type: user.talent.main_talent || null,
          location: `${user.talent.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null}, ${user.talent.country || ''}`,
          city: user.talent.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null,
          country: user.talent.country,
          profile_photo: user.talent.profile_photo,
          video_url: user.talent.video_url || null,
          jobs,
          rating: 0,
          ratinginnumber,
          likes_count: 0,
          unlikes_count: 0,
          reaction: null,
          is_liked: false,
          is_unliked: false,
          views: user.views || 0,
          talentSkills: talentSkillsWithNames,
          is_wishlisted: false,
          wishlist_count: 0,
          availability: user.availability
        }
      });
    }

    /* ============================================================
       USERS WITHOUT MEDIA
    ============================================================ */
    for (const user of usersWithoutMedia) {
      if (!user.talent) continue;

      if (searchText) {
        const match =
          user.username?.toLowerCase().includes(searchText.toLowerCase()) ||
          user.talent.full_name?.toLowerCase().includes(searchText.toLowerCase());

        if (!match) continue;
      }

      const availabilities = await TalentAvailability.findAll({
        where: { talent_id: user.talent.id },
        attributes: ['date', 'start_time', 'end_time', 'price', 'discount']
      });

      if (available_date || available_time || price_range) {
        if (!isTalentAvailable(availabilities, available_date, available_time, price_range)) {
          continue;
        }
      }

      let talentSkills = user.talent.skills || [];
      if (typeof talentSkills === 'string') {
        try {
          talentSkills = JSON.parse(talentSkills);
        } catch {
          talentSkills = [];
        }
      }
      if (skill_id) {
        const skillIdNum = Number(skill_id);
        talentSkills = talentSkills.filter(s => Number(s.id) === skillIdNum);
        if (!talentSkills.length) continue;
      }

      const talentSkillsWithNames = talentSkills.map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate ? s.rate.toString() : '0'
      }));

      const jobs = 0;
      const ratinginnumber = Math.min(5, (jobs / 20) * 5);

      feed.push({
        id: null,
        userId: user.id,
        title: null,
        description: null,
        fileUrl: null,
        type: null,
        visibility: null,
        likes: 0,
        shares: 0,
        skill_id: null,
        TalentRate: talentSkills[0]?.rate ? Number(talentSkills[0].rate) : null,
        likes_count: 0,
        is_liked: false,
        talent: {
          id: user.id,
          user_id: user.id,
          talent_id: user.talent.id,
          username: user.username,
          full_name: user.talent.full_name,
          talent_type: user.talent.main_talent || null,
          location: `${user.talent.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null}, ${user.talent.country || ''}`,
          city: user.talent.city
            ? (await City.findByPk(user.talent.city))?.name || null
            : null,
          country: user.talent.country,
          profile_photo: user.talent.profile_photo,
          video_url: user.talent.video_url || null,
          jobs,
          rating: 0,
          ratinginnumber,
          likes_count: 0,
          unlikes_count: 0,
          reaction: null,
          is_liked: false,
          is_unliked: false,
          views: user.views || 0,
          talentSkills: talentSkillsWithNames,
          is_wishlisted: false,
          wishlist_count: 0,
          availability: user.availability
        }
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

