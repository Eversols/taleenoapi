const { Media, Skill ,sequelize } = require('../models');
const path = require('path');
const { sendJson } = require('../utils/helpers');
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");
const fs = require('fs');
const { sendNotificationByTemplate } = require("../services/notificationService");

exports.upload = async (req, res) => {
  try {
    // Check file
    if (!req.file) {
      return res.status(400).json(sendJson(false, "No file uploaded"));
    }

    const { type } = req.body;

    if (!type) {
      return res.status(400).json(sendJson(false, "Type is required"));
    }

    const file = req.file;

    const fileKey = `uploads/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: fileKey,
      Body: file.buffer,          // IMPORTANT!
      ContentType: file.mimetype 
    };

    console.log("Uploading to S33333:", params);


    // Add after: const file = req.file;

console.log("File object:", {
  fieldname: file.fieldname,
  originalname: file.originalname,
  mimetype: file.mimetype,
  size: file.size,
  hasBuffer: !!file.buffer,
  bufferLength: file.buffer ? file.buffer.length : 0
});

// Verify credentials are loaded
console.log("AWS Config Check:", {
  hasRegion: !!process.env.AWS_REGION,
  hasBucket: !!process.env.AWS_BUCKET,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
});

    await s3.send(new PutObjectCommand(params));

    // Correct S3 URL
    const fileUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    const media = await Media.create({
      userId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      fileUrl,
      type,
      visibility: req.body.visibility === "1",
    });

    return res.status(201).json(
      sendJson(true, "Media uploaded successfully", {
        media: {
          id: media.id,
          title: media.title,
          description: media.description,
          fileUrl: media.fileUrl,
          type: media.type,
          visibility: media.visibility,
          createdAt: media.createdAt,
        },
      })
    );

  } catch (error) {
    console.error("Upload error:", error);

    return res.status(500).json(
      sendJson(false, "Failed to upload media", { error: error.message })
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
    const { type ,id} = req.body;
    const media = await Media.findByPk(id);

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
    if (!type) {
      return res.status(400).json(
        sendJson(false, 'Either a type must be provided for file')
      );
    }
    // // ✅ Add original extension
    // const ext = path.extname(req.file.originalname);
    // const finalFileName = req.file.filename + ext;
    // const finalPath = path.join(path.dirname(req.file.path), finalFileName);

    // // ✅ If file already exists → remove it
    // if (fs.existsSync(finalPath)) {
    //   fs.unlinkSync(finalPath);
    // }

    // // ✅ Rename uploaded file to include extension
    // fs.renameSync(req.file.path, finalPath);

    // const fileUrl = `/uploads/${finalFileName}`;
    const file = req.file;

    const fileKey = `uploads/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    // Works for all buckets, all regions
    const fileUrl = `https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET}/${fileKey}`;

    await media.update({
      fileUrl,
      type,
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

    // const { type } = req.body;
    // Validate skill_id
  // if (!req.body.skill_id) {
  //   return res.status(400).json(
  //     sendJson(false, 'skill_id is required')
  //   );
  // }


    // // Validate at least one update parameter exists
    // if (!type) {
    //   return res.status(400).json(
    //     sendJson(false, 'Either a type must be provided for file')
    //   );
    // }

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
    // if (!req.file) {
    //   return res.status(400).json(
    //     sendJson(false, 'No file uploaded')
    //   );
    // }

    // // ✅ Add original extension
    // const ext = path.extname(req.file.originalname);
    // const finalFileName = req.file.filename + ext;
    // const finalPath = path.join(path.dirname(req.file.path), finalFileName);

    // // ✅ If file already exists → remove it
    // if (fs.existsSync(finalPath)) {
    //   fs.unlinkSync(finalPath);
    // }

    // // ✅ Rename uploaded file to include extension
    // fs.renameSync(req.file.path, finalPath);

    // const fileUrl = `/uploads/${finalFileName}`;

    await media.update({
      // skill_id: req.body.skill_id,
      title: req.body.title,
      description: req.body.description,
      // fileUrl,
      // type: type,
      visibility: req.body.visibility === '1' ? true : false
    });
    // let skill = null;
    // if (req.body.skill_id) {
    //   skill = await Skill.findByPk(req.body.skill_id, {
    //     attributes: ['id', 'name']
    //   });
    // }
    return res.status(200).json(
      sendJson(true, 'Media updated successfully', {
        media: {
          id: media.id,
          title: media.title,
          description: media.description,
          fileUrl: media.fileUrl,
          type: media.type,
          // skill: skill || null,  // Returns null if no skill found
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
    const { id } = req.params; // media id
    const userId = req.user.id;

    const media = await Media.findByPk(id);
    if (!media) {
      return res.status(404).json(sendJson(false, 'Media not found'));
    }

    // check if user already liked
    const existing = await sequelize.models.MediaLike.findOne({
      where: { media_id: id, user_id: userId }
    });

    if (existing) {
      // unlike (remove record)
      await existing.destroy();
      const likesCount = await sequelize.models.MediaLike.count({
        where: { media_id: id }
      });

      return res.status(200).json(
        sendJson(true, 'Media unliked successfully', {
          likes_count: likesCount,
          is_liked: false
        })
      );
    } else {
      // like (create record)
      await sequelize.models.MediaLike.create({
        media_id: id,
        user_id: userId
      });

      const likesCount = await sequelize.models.MediaLike.count({
        where: { media_id: id }
      });
      
          // 🔔 SEND NOTIFICATION (safe)
      if (
        media?.user?.player_id &&
        media.user.id !== userId
      ) {
        try {
          await sendNotificationByTemplate({
            template: "liked",
            playerIds: [media.user.player_id],
            variables: {
              userName: req.user.full_name || req.user.username,
              serviceName: media.title || "your media"
            },
            data: {
              type: "MEDIA_LIKE",
              mediaId: media.id
            }
          });
        } catch (notifyError) {
          console.error("Like notification failed:", notifyError.message);
        }
      }

      return res.status(200).json(
        sendJson(true, 'Media liked successfully', {
          likes_count: likesCount,
          is_liked: true
        })
      );
    }
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to like/unlike media', { error: error.message })
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