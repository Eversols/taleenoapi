const { Like, Share, Talent, User, sequelize } = require('../models');
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
exports.getAllTalents = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    
    // Using raw query with JOIN
    const talents = await sequelize.query(`
      SELECT 
        t.*, 
        u.id as "user_id", 
        u.username, 
        t.profile_photo,
        (SELECT COUNT(*) FROM likes WHERE talent_id = t.id) as "likes_count",
        (SELECT COUNT(*) FROM shares WHERE talent_id = t.id) as "shares_count"
      FROM talents t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Process the talents to include full URLs for profile photos
    const talentsWithFullUrls = talents.map(talent => {
      if (talent.profile_photo) {
        return {
          ...talent,
          profile_photo: `${BASE_URL}/${talent.profile_photo.replace(/^\//, '')}`
        };
      }
      return talent;
    });

    return res.json(
      sendJson(true, 'Talents fetched successfully', {
        count: talentsWithFullUrls.length,
        talents: talentsWithFullUrls
      })
    );
  } catch (error) {
    console.error('Get All Talents Error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to fetch talents', { 
        error: error.message 
      })
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