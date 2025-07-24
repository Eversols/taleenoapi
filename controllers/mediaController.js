const { Media } = require('../models');
const path = require('path');

exports.upload = async (req, res) => {
  try {
    const fileUrl = `/uploads/${req.file.filename}`;
    const media = await Media.create({
      userId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      fileUrl,
      type: req.file.mimetype.includes('video') ? 'video' : 'image',
      visibility: req.body.visibility || 'public'
    });
    res.json({ success: true, media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.list = async (req, res) => {
  const media = await Media.findAll({ where: { userId: req.user.id } });
  res.json({ success: true, media });
};

exports.update = async (req, res) => {
  const media = await Media.findByPk(req.params.id);
  if (!media || media.userId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  await media.update(req.body);
  res.json({ success: true, media });
};

exports.remove = async (req, res) => {
  const media = await Media.findByPk(req.params.id);
  if (!media || media.userId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  await media.destroy();
  res.json({ success: true, message: 'Deleted' });
};

exports.like = async (req, res) => {
  const media = await Media.findByPk(req.params.id);
  await media.increment('likes');
  res.json({ success: true });
};

exports.share = async (req, res) => {
  const media = await Media.findByPk(req.params.id);
  await media.increment('shares');
  res.json({ success: true, url: `https://example.com/media/${media.id}` });
};


