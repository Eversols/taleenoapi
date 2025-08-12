const { Like, Share, Talent, User, Wishlist,Skill,sequelize } = require('../models');
const { sendJson } = require('../utils/helpers');
const { Op } = require('sequelize');

// Like a talent
exports.likeTalent = async (req, res) => {
  try {
    const { talent_id } = req.body;

    if (!talent_id) {
      return res.status(400).json(
        sendJson(false, 'Talent ID is required')
      );
    }

    // Using raw query with JOIN instead of include
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

    const existingLike = await Like.findOne({
      where: { 
        user_id: req.user.id, 
        talent_id 
      }
    });

    if (existingLike) {
      await existingLike.destroy();
      const likes_count = await Like.count({ where: { talent_id } });
      
      return res.status(200).json(
        sendJson(true, 'Talent unliked successfully', {
          talent: {
            id: talent.id,
            username: talent.user.username,
            likes_count
          }
        })
      );
    }

    await Like.create({ user_id: req.user.id, talent_id });
    const likes_count = await Like.count({ where: { talent_id } });

    return res.status(201).json(
      sendJson(true, 'Talent liked successfully', {
        talent: {
          id: talent.id,
          username: talent.user.username,
          likes_count
        }
      })
    );

  } catch (error) {
    console.error('Like Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to process like', {
        error: error.message
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

    // Add full URL for profile photo if talent
    if (user.role === 'talent' && user.talent?.profile_photo) {
      user.talent.profile_photo = `${BASE_URL}/${user.talent.profile_photo.replace(/^\//, '')}`;
    }

    const userData = {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      on_board: user.on_board,
      ...(user.role === 'talent' ? { talent: user.talent } : { client: user.client })
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
    const { id } = req.params;
    
    // Using raw query to find talent
    const [talent] = await sequelize.query(`
      SELECT * FROM talents WHERE id = :id LIMIT 1
    `, {
      replacements: { id },
      type: sequelize.QueryTypes.SELECT
    });

    if (!talent) {
      return res.status(404).json(
        sendJson(false, 'Talent not found')
      );
    }

    if (talent.user_id !== req.user.id) {
      return res.status(403).json(
        sendJson(false, 'Not authorized to delete this talent')
      );
    }

    await sequelize.query(`
      DELETE FROM talents WHERE id = :id
    `, {
      replacements: { id }
    });

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
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';

    // const rows = await sequelize.query(`
    //   SELECT 
    //     w.id AS wishlist_id,
    //     t.id AS talent_id,
    //     t.skills as skills,
    //     u.id AS user_id,
    //     u.username,
    //     t.profile_photo
    //   FROM Wishlists w
    //   INNER JOIN talents t ON t.id = w.talent_id
    //   INNER JOIN users u ON u.id = t.user_id
    //   WHERE w.user_id = :userId
    //   GROUP BY w.id, t.id, u.id, u.username, t.profile_photo
    //   ORDER BY w.id DESC
    // `, {
    //   replacements: { userId },
    //   type: sequelize.QueryTypes.SELECT
    // });
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


    const formattedWishlist = rows.map(row => ({
      id: row.wishlist_id,
      talent: {
        id: row.talent_id,
        userId: row.user_id,
        username: row.username,
        skills: row.skills,
        profile_photo: row.profile_photo 
          ? `${BASE_URL}/${row.profile_photo.replace(/^\//, '')}`
          : null,
      }
    }));

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