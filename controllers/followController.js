const { Follow, User } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.getFollowing = async (req, res) => {
  try {
    const { Skill, Talent } = require('../models');

    // Fetch all skills to map IDs to names
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillMap = {};
    allSkills.forEach(skill => {
      skillMap[skill.id] = skill.name;
    });

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json(sendJson(false, 'User not found'));
    }

    const following = await Follow.findAll({
      where: { followerId: req.user.id },
      include: [{
        model: User,
        as: 'following',
        attributes: ['id', 'username'],
        include: [{
          model: Talent,
          as: 'talent',
          attributes: ['profile_photo', 'skills']
        }]
      }],
      attributes: ['id', 'createdAt']
    });

    const formattedFollowing = following.map(f => {
      const skillIds = f.following?.talent?.skills || [];
      const skillNames = Array.isArray(skillIds)
        ? skillIds.map(id => skillMap[id]).filter(Boolean)
        : [];

      return {
        id: f.id,
        createdAt: f.createdAt,
        user: {
          id: f.following?.id,
          username: f.following?.username,
          profile_photo: f.following?.talent?.profile_photo ?? null,
          skills: skillNames
        }
      };
    });

    return res.status(200).json(
      sendJson(true, 'Following list retrieved successfully', {
        following: formattedFollowing
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve following list', {
        error: error.message
      })
    );
  }
};

exports.follow = async (req, res) => {
  try {
    // Validate target user exists
    const targetUser = await User.findByPk(req.params.userId);
    if (!targetUser) {
      return res.status(404).json(
        sendJson(false, 'User to follow not found')
      );
    }

    // Check if already following
    const existing = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.userId
      }
    });

    if (existing) {
      return res.status(400).json(
        sendJson(false, 'You are already following this user')
      );
    }

    // Create follow relationship
    const follow = await Follow.create({
      followerId: req.user.id,
      followingId: req.params.userId
    });

    return res.status(201).json(
      sendJson(true, 'Successfully followed user', {
        followId: follow.id,
        followingId: follow.followingId
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to follow user', {
        error: error.message
      })
    );
  }
};

exports.unfollow = async (req, res) => {
  try {
    const follow = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.userId
      }
    });

    if (!follow) {
      return res.status(404).json(
        sendJson(false, 'You are not following this user')
      );
    }

    await follow.destroy();
    return res.status(200).json(
      sendJson(true, 'Successfully unfollowed user', {
        unfollowedUserId: req.params.userId
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to unfollow user', {
        error: error.message
      })
    );
  }
};