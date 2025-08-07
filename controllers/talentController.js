// talentController.js (complete corrected version)
const { Like, Share, Talent, User } = require('../models');
const { sendJson } = require('../utils/helpers');
const { Op } = require('sequelize');

// Like a talent
exports.likeTalent = async (req, res) => {
  try {
    const { talent_id } = req.body;

    // Validate input
    if (!talent_id) {
      return res.status(400).json(
        sendJson(false, 'Talent ID is required')
      );
    }

    const talent = await Talent.findByPk(talent_id, {
      include: [{
        model: User,
        attributes: ['id', 'username']
      }]
    });

    if (!talent) {
      return res.status(404).json(
        sendJson(false, 'Talent not found')
      );
    }

    // Check if like already exists
    const existingLike = await Like.findOne({
      where: { 
        user_id: req.user.id, 
        talent_id 
      }
    });

    if (existingLike) {
      // Unlike if already liked
      await existingLike.destroy();
      
      // Get updated like count
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

    // Create new like
    await Like.create({
      user_id: req.user.id,
      talent_id
    });

    // Get updated like count
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

    // Validate input
    if (!talent_id) {
      return res.status(400).json(
        sendJson(false, 'Talent ID is required')
      );
    }

    const talent = await Talent.findByPk(talent_id, {
      include: [{
        model: User,
        attributes: ['id', 'username']
      }]
    });

    if (!talent) {
      return res.status(404).json(
        sendJson(false, 'Talent not found')
      );
    }

    // Create share record
    await Share.create({
      user_id: req.user.id,
      talent_id
    });

    // Get updated share count
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