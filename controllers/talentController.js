const { Like, Share, Talent, User, Wishlist, Skill, sequelize } = require('../models');
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
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'id', s.id,
        'name', s.name,
        'rate', jt.rate
      )
    ) AS skills
  FROM Wishlists w
  INNER JOIN talents t ON t.id = w.talent_id
  INNER JOIN users u ON u.id = t.user_id
  JOIN JSON_TABLE(
    t.skills, 
    '$[*]' COLUMNS(
      skill_id INT PATH '$.id',
      rate VARCHAR(10) PATH '$.rate'
    )
  ) jt ON jt.skill_id IS NOT NULL
  LEFT JOIN skills s ON s.id = jt.skill_id
  WHERE w.user_id = :userId
  GROUP BY w.id, t.id, u.id, u.username, t.profile_photo
  ORDER BY w.id DESC
`, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';

    const formattedWishlist = rows.map(row => {
      let profile_photo = null;

      if (row.profile_photo) {
        // Normalize path: remove leading slash if exists
        profile_photo = `${BASE_URL}${row.profile_photo.replace(/^\/?uploads\//, '')}`;
      }

      return {
        id: row.wishlist_id,
        talent: {
          id: row.talent_id,
          userId: row.user_id,
          username: row.username,
          skills: row.skills,
          profile_photo
        }
      };
    });

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