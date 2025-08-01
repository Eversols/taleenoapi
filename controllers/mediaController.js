const { Media , Skill  } = require('../models');
const path = require('path');
const { sendJson } = require('../utils/helpers');
const fs = require('fs');

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(
        sendJson(false, 'No file uploaded')
      );
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const media = await Media.create({
      userId: req.user.id,
      skill_id: req.body.skill_id,
      title: req.body.title,
      description: req.body.description,
      fileUrl,
      type: req.file.mimetype.includes('video') ? 'video' : 'image',
      visibility: req.body.visibility === '1' ? true : false
    });
    let skill = null;
    if (req.body.skill_id) {
      skill = await Skill.findByPk(req.body.skill_id, {
        attributes: ['id', 'name']
      });
    }
    return res.status(201).json(
      sendJson(true, 'Media uploaded successfully', {
        media: {
          id: media.id,
          title: media.title,
          description: media.description,
          fileUrl: media.fileUrl,
          type: media.type,
          skill: skill || null,  // Returns null if no skill found
          visibility: media.visibility,
          createdAt: media.createdAt
        }
      })
    );

  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, '../public', req.file.path));
    }
    return res.status(500).json(
      sendJson(false, 'Failed to upload media', {
        error: error.message
      })
    );
  }
};

exports.list = async (req, res) => {
  try {
    const media = await Media.findAll({ 
      where: { userId: req.user.id },
      attributes: ['id', 'title', 'description', 'fileUrl', 'type', 'visibility', 'createdAt']
    });

    return res.status(200).json(
      sendJson(true, 'Media retrieved successfully', {
        media
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve media', {
        error: error.message
      })
    );
  }
};

exports.update = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);
    
    if (!media) {
      return res.status(404).json(
        sendJson(false, 'Media not found')
      );
    }

    if (media.userId !== req.user.id) {
      return res.status(403).json(
        sendJson(false, 'You are not authorized to update this media')
      );
    }
    if (!req.file) {
      return res.status(400).json(
        sendJson(false, 'No file uploaded')
      );
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    await media.update({
      skill_id: req.body.skill_id,
      title: req.body.title,
      description: req.body.description,
      fileUrl,
      type: req.file.mimetype.includes('video') ? 'video' : 'image',
      visibility: req.body.visibility === '1' ? true : false
    });
    let skill = null;
    if (req.body.skill_id) {
      skill = await Skill.findByPk(req.body.skill_id, {
        attributes: ['id', 'name']
      });
    }
    return res.status(200).json(
      sendJson(true, 'Media updated successfully', {
        media: {
          id: media.id,
          title: media.title,
          description: media.description,
          fileUrl: media.fileUrl,
          type: media.type,
          skill: skill || null,  // Returns null if no skill found
          visibility: media.visibility,
          createdAt: media.createdAt
        }
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to update media', {
        error: error.message
      })
    );
  }
};

exports.remove = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);
    
    if (!media) {
      return res.status(404).json(
        sendJson(false, 'Media not found')
      );
    }

    if (media.userId !== req.user.id) {
      return res.status(403).json(
        sendJson(false, 'You are not authorized to delete this media')
      );
    }

    // Delete the file from storage
    fs.unlinkSync(path.join(__dirname, '../public', media.fileUrl));
    
    await media.destroy();
    return res.status(200).json(
      sendJson(true, 'Media deleted successfully')
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to delete media', {
        error: error.message
      })
    );
  }
};

exports.like = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);
    
    if (!media) {
      return res.status(404).json(
        sendJson(false, 'Media not found')
      );
    }

    await media.increment('likes');
    return res.status(200).json(
      sendJson(true, 'Media liked successfully', {
        likes: media.likes + 1
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to like media', {
        error: error.message
      })
    );
  }
};

exports.share = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);
    
    if (!media) {
      return res.status(404).json(
        sendJson(false, 'Media not found')
      );
    }

    await media.increment('shares');
    return res.status(200).json(
      sendJson(true, 'Share link generated', {
        url: `https://api.eversols.com/media/${media.id}`,
        shares: media.shares + 1
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to generate share link', {
        error: error.message
      })
    );
  }
};