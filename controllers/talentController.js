const { Like, Share, Talent, User, Wishlist, Skill,Media, sequelize } = require('../models');
const { sendJson } = require('../utils/helpers');
const { Op } = require('sequelize');

// Like a talent
exports.likeTalent = async (req, res) => {
  try {
    console.log("==== Incoming Request ====");
    console.log("Raw Body:", req.body);
    console.log("User Object:", req.user);

    const { talent_id, type } = req.body; // type = "like" | "unlike"
    console.log("Parsed talent_id:", talent_id, "type:", type);

    if (!talent_id || !["like", "unlike"].includes(type)) {
      console.log("❌ Invalid input, exiting early");
      return res.status(400).json(
        sendJson(false, 'Talent ID and valid type ("like" or "unlike") are required')
      );
    }

    // Fetch talent with user info
    const [talent] = await sequelize.query(`
      SELECT t.id, u.username
      FROM talents t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = :talent_id
      LIMIT 1
    `, {
      replacements: { talent_id },
      type: sequelize.QueryTypes.SELECT
    });

    console.log("Fetched Talent:", talent);

    if (!talent) {
      console.log("❌ Talent not found");
      return res.status(404).json(sendJson(false, 'Talent not found'));
    }

    // Check if reaction exists
    const [existingReaction] = await sequelize.query(`
      SELECT id, type 
      FROM likes 
      WHERE user_id = :user_id AND talent_id = :talent_id
      LIMIT 1
    `, {
      replacements: { user_id: req.user?.id, talent_id },
      type: sequelize.QueryTypes.SELECT
    });

    console.log("Existing Reaction:", existingReaction);

    if (existingReaction) {
      if (existingReaction.type === type) {
        return res.status(400).json(sendJson(false, 'This Talent Already ' + type));
      } else {
        console.log("✏ Updating reaction to new type:", type);
        await sequelize.query(`
          UPDATE likes 
          SET type = :type, updated_at = NOW()
          WHERE id = :id
        `, {
          replacements: { type, id: existingReaction.id }
        });
      }
    } else {
      console.log("➕ Inserting new reaction");
      await sequelize.query(`
        INSERT INTO likes (user_id, talent_id, type, created_at, updated_at)
        VALUES (:user_id, :talent_id, :type, NOW(), NOW())
      `, {
        replacements: { user_id: req.user?.id, talent_id, type }
      });
    }

    // Get counts
    const [counts] = await sequelize.query(`
      SELECT 
        SUM(CASE WHEN l.type = 'like' THEN 1 ELSE 0 END) as likes_count,
        SUM(CASE WHEN l.type = 'unlike' THEN 1 ELSE 0 END) as unlikes_count
      FROM likes l
      WHERE l.talent_id = :talent_id
    `, {
      replacements: { talent_id },
      type: sequelize.QueryTypes.SELECT
    });

    console.log("Counts:", counts);

    return res.status(200).json(
      sendJson(true, 'Reaction updated successfully', {
        talent: {
          id: talent.id,
          username: talent.username,
          likes_count: counts.likes_count || 0,
          unlikes_count: counts.unlikes_count || 0
        }
      })
    );

  } catch (error) {
    console.error('❌ Reaction Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to process reaction', {
        error: error.message,
        stack: error.stack
      })
    );
  }
};

// Share a talent
exports.shareTalent = async (req, res) => {
  try {
    const { talent_id } = req.body;

    if (!talent_id) {
      return res.status(400).json(
        sendJson(false, 'Talent ID is required')
      );
    }

    // Using raw query with JOIN
    const [talent] = await sequelize.query(`
      SELECT t.*, u.id as "user.id", u.username as "user.username"
      FROM talents t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = :talent_id
      LIMIT 1
    `, {
      replacements: { talent_id },
      type: sequelize.QueryTypes.SELECT
    });

    if (!talent) {
      return res.status(404).json(
        sendJson(false, 'Talent not found')
      );
    }

    await Share.create({ user_id: req.user.id, talent_id });
    const shares_count = await Share.count({ where: { talent_id } });

    return res.status(201).json(
      sendJson(true, 'Talent shared successfully', {
        talent: {
          id: talent.id,
          username: talent.user.username,
          shares_count
        }
      })
    );

  } catch (error) {
    console.error('Share Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to share talent', {
        error: error.message
      })
    );
  }
};

// Get all talents with explicit JOIN
exports.getUserDetails = async (req, res) => {
  try {
    const authUser = req.user; // assuming authentication middleware sets this
    if (!authUser) {
      return res.status(401).json(sendJson(false, 'Unauthorized', {}));
    }

    // Fetch user with role-based details
    const user = await User.findOne({
      where: { id: authUser.id },
      attributes: { exclude: ['password', 'verification_code', 'verification_code_expire'] },
      include: [
        {
          association: 'talent',
          attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
        },
        {
          association: 'client',
          attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json(sendJson(false, 'User not found'));
    }

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';

    // 👉 Fetch all skills dictionary
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    // 👉 Attach skill names to talent
    let talentData = null;
    if (user.role === 'talent' && user.talent) {
      talentData = {
        ...user.talent.toJSON(),
        skills: (user.talent.skills || []).map(s => ({
          id: s.id,
          name: skillsMap[s.id] || null,
          rate: s.rate
        }))
      };

      // ✅ Fix: update profile_photo directly on talentData
      if (talentData.profile_photo) {
        talentData.profile_photo = `${BASE_URL}/${talentData.profile_photo.replace(/^\//, '')}`;
      }
    }

    const userData = {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      on_board: user.on_board,
      ...(user.role === 'talent' ? { talent: talentData } : { client: user.client })
    };

    return res.json(sendJson(true, 'User details fetched successfully', userData));
  } catch (error) {
    console.error('Get User Details Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to fetch user details', { error: error.message })
    );
  }
};
exports.getTalentDetails = async (req, res) => {
  try {
    const { talent_id } = req.query; // Get talent_id from URL parameter
    if (!talent_id) {
      return res.status(400).json({ success: false, message: "talent_id is required" });
    }

    // Fetch the talent user and their associated talent details
    const user = await User.findOne({
      where: { role: 'talent', id: talent_id, is_blocked: 0 },
      include: [
        {
          association: 'talent',
          attributes: [
            "id", "full_name", "city", "country", "profile_photo", "video_url",
            "main_talent", "skills", "availability",
            [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'like')`), 'likes_count'],
            [sequelize.literal(`(SELECT COUNT(*) FROM likes l WHERE l.talent_id = talent.id AND l.type = 'unlike')`), 'unlikes_count'],
            [sequelize.literal(`(SELECT COUNT(*) FROM bookings b WHERE b.talent_id = talent.id)`), 'total_bookings'],
            [sequelize.literal(`(SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = talent.id ${req.user ? `AND w.user_id = ${req.user.id}` : ''})`), 'is_wishlisted']
          ]
        }
      ]
    });

    if (!user || !user.talent) {
      return res.status(404).json({ success: false, message: "Talent not found" });
    }

    // Parse skills and availability
    const talentSkills = user.talent.skills || [];
    let availabilityHours = 0;
    try {
      const availData = JSON.parse(user.talent.availability || '[]');
      availabilityHours = availData.reduce((sum, slot) => sum + (slot.hours || 0), 0);
    } catch (err) {
      console.error("Error parsing availability:", err.message);
    }

    // Fetch all media related to this talent
    const mediaItems = await Media.findAll({
      where: { userId: user.id },
      order: [['id', 'DESC']]
    });

    // Map media to desired structure
    const contents = await Promise.all(mediaItems.map(async (media) => {
      const likes = await sequelize.models.MediaLike.count({ where: { media_id: media.id } });
      const views = media.views || 0;
      return {
        type: media.type || 'image', // default to image if not specified
        url: media.fileUrl?.startsWith('http') ? media.fileUrl : `${process.env.APP_URL}/${media.fileUrl}`,
        likes,
        views
      };
    }));

    // Prepare response
    const response = {
      talent: {
        title: user.talent.main_talent || user.talent.full_name,
        description: user.talent.description || `Expert in ${user.talent.main_talent || 'their field'}`,
        skills: talentSkills.map(s => s.name).join(', '),
        availabilityHours,
        profilePhoto: user.talent.profile_photo?.startsWith('http') ? user.talent.profile_photo : `${process.env.APP_URL}/${user.talent.profile_photo}`,
        contents
      }
    };

    return res.status(200).json({ success: true, message: "Talent details retrieved successfully", ...response });

  } catch (error) {
    console.error('Get Talent Details Error:', error);
    return res.status(500).json({ success: false, message: "Failed to retrieve talent details", error: error.message });
  }
};



// Delete a talent
exports.deleteTalent = async (req, res) => {
  try {
    const { id } = req.body;

    // Find the talent
    const talent = await Talent.findByPk(id);

    if (!talent) {
      return res.status(404).json(
        sendJson(false, 'Talent not found')
      );
    }

    // Authorization check (customize as needed)
    if (!req.user || !req.user.id) {
      return res.status(403).json(
        sendJson(false, 'Not authorized to delete this talent')
      );
    }

    // Delete the talent
    await talent.destroy({ force: true });

    return res.json(
      sendJson(true, 'Talent deleted successfully')
    );
  } catch (error) {
    console.error('Delete Talent Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to delete talent', {
        error: error.message
      })
    );
  }
};
// Add to Wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { talentId } = req.body;
    const userId = req.user.id;

    // Check if talent exists
    const talent = await Talent.findByPk(talentId);
    if (!talent) {
      return res.status(404).json(sendJson(false, 'Talent not found'));
    }

    // Check if already in wishlist
    const existingWishlist = await Wishlist.findOne({
      where: { userId, talentId }
    });

    if (existingWishlist) {
      return res.status(400).json(sendJson(false, 'Talent already in wishlist'));
    }

    // Add to wishlist
    const wishlistItem = await Wishlist.create({ userId, talentId });

    return res.status(201).json(
      sendJson(true, 'Talent added to wishlist successfully', { wishlistItem })
    );
  } catch (error) {
    console.error('Add to Wishlist Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to add to wishlist', {
        error: error.message
      })
    );
  }
};

// Get Wishlist
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await sequelize.query(`
      SELECT 
        w.id AS wishlist_id,
        t.id AS talent_id,
        u.id AS user_id,
        u.username,
        t.profile_photo,
        t.skills AS talent_skills,
        (
          SELECT type 
          FROM likes l 
          WHERE l.talent_id = t.id 
            AND l.user_id = :userId
          LIMIT 1
        ) AS reaction
      FROM Wishlists w
      LEFT JOIN talents t ON t.id = w.talent_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE w.user_id = :userId
      GROUP BY w.id, t.id, u.id, u.username, t.profile_photo, t.skills
      ORDER BY w.id DESC
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Load all skills once into a map
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';

    // FIX: Use async map + Promise.all
    const formattedWishlist = await Promise.all(
      rows.map(async (row) => {
        let profile_photo = null;

        if (row.profile_photo) {
          profile_photo = `${row.profile_photo.replace(/^\/?uploads\//, 'uploads/')}`;
        }

        // Prevent undefined errors
        const talentSkills = row?.talent_skills || [];

        const talentSkillsWithNames = talentSkills.map(s => ({
          id: s.id,
          name: skillsMap[s.id] || null,
          rate: s.rate
        }));

        // Convert like field
        let like = null;
        if (row.reaction === 'like') like = true;
        if (row.reaction === 'unlike') like = false;

        return {
          id: row.wishlist_id,
          talent: {
            id: row.talent_id,
            userId: row.user_id,
            username: row.username,
            profile_photo,
            skills: talentSkillsWithNames,
            reaction: row.reaction || null,
            like
          }
        };
      })
    );

    return res.status(200).json(
      sendJson(true, 'Wishlist retrieved successfully', {
        count: formattedWishlist.length,
        wishlist: formattedWishlist
      })
    );
  } catch (error) {
    console.error('Get Wishlist Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve wishlist', {
        error: error.message
      })
    );
  }
};





// Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const wishlistItem = await Wishlist.findOne({
      where: { id, userId }
    });

    if (!wishlistItem) {
      return res.status(404).json(sendJson(false, 'Wishlist item not found'));
    }

    await wishlistItem.destroy();

    return res.status(200).json(
      sendJson(true, 'Talent removed from wishlist successfully')
    );
  } catch (error) {
    console.error('Remove from Wishlist Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to remove from wishlist', {
        error: error.message
      })
    );
  }
};

exports.viewTalent = async (req, res) => {
  try {
    const { talent_id } = req.body;

    if (!talent_id) {
      return res.status(400).json(sendJson(false, "Talent ID is required"));
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(sendJson(false, "Unauthorized"));
    }

    // Increment views for this talent
    await sequelize.query(`
      UPDATE users 
      SET views = COALESCE(views, 0) + 1 
      WHERE id = :talent_id
    `, {
      replacements: { talent_id }
    });

    return res.status(200).json(sendJson(true, "Talent view incremented successfully"));

  } catch (error) {
    console.error("❌ ViewTalent Error:", error);
    return res.status(500).json(
      sendJson(false, "Failed to increment views", { error: error.message })
    );
  }
};
// Get all talents with all related data
exports.getTalents = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    const rows = await sequelize.query(`
      SELECT 
        t.id AS talent_id,
        t.full_name,
        t.gender,
        t.age,
        t.country,
        t.city,
        t.languages,
        t.main_talent,
        t.skills AS talent_skills,
        t.experience_level,
        t.hourly_rate,
        t.currency,
        t.about,
        t.profile_photo,
        t.is_approved AS status,  -- ✅ alias is_approved as status
        t.availability,
        t.video_url,
        t.created_at,
        u.id AS user_id,
        u.username,
        u.email,
        u.phone_number,
        u.status,
        u.deleted_at,
        (
          SELECT COUNT(*) FROM likes l WHERE l.talent_id = t.id AND l.type = 'like'
        ) AS likes_count,
        (
          SELECT COUNT(*) FROM likes l WHERE l.talent_id = t.id AND l.type = 'unlike'
        ) AS unlikes_count,
        (
          SELECT COUNT(*) FROM shares s WHERE s.talent_id = t.id
        ) AS shares_count,
        (
          SELECT type FROM likes l WHERE l.talent_id = t.id AND l.user_id = :userId LIMIT 1
        ) AS reaction,
        (
          SELECT COUNT(*) FROM Wishlists w WHERE w.talent_id = t.id AND w.user_id = :userId
        ) AS in_wishlist
      FROM talents t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.id DESC
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Fetch all skills once
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';

    // Format response
    const formattedTalents = rows
      // .filter(row => row.availability) // ✅ skip talents with NULL availability
      .map(row => {
        let profile_photo = null;
        if (row.profile_photo) {
          profile_photo = `${BASE_URL}/${row.profile_photo.replace(/^\/?uploads\//, 'uploads/')}`;
        }

        let parsedSkills = [];
        try {
          const skillsArray = row.talent_skills ? JSON.parse(row.talent_skills) : [];
          parsedSkills = Array.isArray(skillsArray)
            ? skillsArray.map(s => ({
                id: s.id,
                name: skillsMap[s.id] || null,
                rate: s.rate
              }))
            : [];
        } catch (e) {
          parsedSkills = [];
        }

        let like = null;
        if (row.reaction === 'like') like = true;
        else if (row.reaction === 'unlike') like = false;

        return {
          id: row.talent_id,
          full_name: row.full_name,
          gender: row.gender,
          age: row.age,
          country: row.country,
          city: row.city,
          languages: row.languages,
          main_talent: row.main_talent,
          experience_level: row.experience_level,
          hourly_rate: row.hourly_rate,
          currency: row.currency,
          about: row.about,
          profile_photo,
          video_url: row.video_url,
          status: row.status, // 👈 alias for is_approved
          availability: row.availability,
          created_at: row.created_at,
          user: {
            id: row.user_id,
            username: row.username,
            email: row.email,
            phone_number: row.phone_number,
            deleted_at: row.deleted_at,
            status: row.status,
          },
          skills: parsedSkills,
          likes_count: row.likes_count || 0,
          unlikes_count: row.unlikes_count || 0,
          shares_count: row.shares_count || 0,
          reaction: row.reaction || null,
          like,
          in_wishlist: !!row.in_wishlist,
        };
      });

    return res.status(200).json(
      sendJson(true, 'Talents retrieved successfully', {
        count: formattedTalents.length,
        talents: formattedTalents
      })
    );
  } catch (error) {
    console.error('❌ Get Talents Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve talents', {
        error: error.message
      })
    );
  }
};
