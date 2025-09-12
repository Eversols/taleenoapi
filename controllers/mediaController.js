const { Media, Skill ,sequelize } = require('../models');
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
    const { type } = req.body;

    // Validate at least one update parameter exists
    if (!type) {
      return res.status(400).json(
        sendJson(false, 'Either a type must be provided for file')
      );
    }
    // ✅ Add original extension
    const ext = path.extname(req.file.originalname);
    const finalFileName = req.file.filename + ext;
    const finalPath = path.join(path.dirname(req.file.path), finalFileName);

    // ✅ If file already exists → remove it
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }

    // ✅ Rename uploaded file to include extension
    fs.renameSync(req.file.path, finalPath);

    const fileUrl = `/uploads/${finalFileName}`;

    const media = await Media.create({
      userId: req.user.id,
      skill_id: req.body.skill_id,
      title: req.body.title,
      description: req.body.description,
      fileUrl,
      type: type,
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
          skill: skill || null,
          visibility: media.visibility,
          createdAt: media.createdAt
        }
      })
    );

  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.warn("Cleanup failed:", err.message);
      }
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
    const BASE_URL = process.env.APP_URL;

    // ✅ Extract pagination params (default page=1, limit=10)
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let offset = (page - 1) * limit;

    // ✅ Fetch total count for pagination metadata
    const totalCount = await Media.count({
      where: { userId: req.user.id }
    });

    const media = await Media.findAll({
      where: { userId: req.user.id },
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM media_wishlist AS mw 
              WHERE mw.media_id = Media.id
            )`),
            'wishlist_count'
          ]
        ]
      },
      include: [
        {
          model: Skill,
          as: 'skill',
          attributes: ['id', 'name']
        }
      ],
      limit,
      offset,
      order: [['id', 'DESC']] // optional sorting
    });

    // Append BASE_URL to fileUrl
    const formattedMedia = media.map(item => {
      const data = item.toJSON();
      data.fileUrl = data.fileUrl ? `${BASE_URL}${data.fileUrl}` : null;
      return data;
    });

    // ✅ Return paginated response
    return res.status(200).json(
      sendJson(true, 'Media retrieved successfully', {
        media: formattedMedia,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
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


exports.updateonlyImg = async (req, res) => {
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

    // ✅ Add original extension
    const ext = path.extname(req.file.originalname);
    const finalFileName = req.file.filename + ext;
    const finalPath = path.join(path.dirname(req.file.path), finalFileName);

    // ✅ If file already exists → remove it
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }

    // ✅ Rename uploaded file to include extension
    fs.renameSync(req.file.path, finalPath);

    const fileUrl = `/uploads/${finalFileName}`;

    await media.update({
      fileUrl,
      type: req.file.mimetype.includes('video') ? 'video' : 'image',
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

exports.update = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);

    const { type } = req.body;

    // Validate at least one update parameter exists
    if (!type) {
      return res.status(400).json(
        sendJson(false, 'Either a type must be provided for file')
      );
    }

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

    // ✅ Add original extension
    const ext = path.extname(req.file.originalname);
    const finalFileName = req.file.filename + ext;
    const finalPath = path.join(path.dirname(req.file.path), finalFileName);

    // ✅ If file already exists → remove it
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }

    // ✅ Rename uploaded file to include extension
    fs.renameSync(req.file.path, finalPath);

    const fileUrl = `/uploads/${finalFileName}`;

    await media.update({
      skill_id: req.body.skill_id,
      title: req.body.title,
      description: req.body.description,
      fileUrl,
      type: type,
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

    // Construct full path to the file
    const fullPath = path.join(__dirname, '../public', media.fileUrl);

    // Safely attempt to delete the file
    fs.access(fullPath, fs.constants.F_OK, async (err) => {
      if (!err) {
        try {
          await fs.promises.unlink(fullPath);
        } catch (unlinkError) {
          console.warn("Failed to delete file:", unlinkError.message);
        }
      } else {
        console.warn("File does not exist, skipping deletion:", fullPath);
      }

      // Remove the database record after handling file
      await media.destroy();

      return res.status(200).json(
        sendJson(true, 'Media deleted successfully')
      );
    });

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