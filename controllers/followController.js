const { Follow, User } = require('../models');

exports.getFollowing = async (req, res) => {
  const following = await Follow.findAll({ where: { followerId: req.user.id } });
  res.json({ success: true, following });
};

exports.follow = async (req, res) => {
  const existing = await Follow.findOne({ where: { followerId: req.user.id, followingId: req.params.userId } });
  if (existing) return res.status(400).json({ message: 'Already following' });
  await Follow.create({ followerId: req.user.id, followingId: req.params.userId });
  res.json({ success: true });
};

exports.unfollow = async (req, res) => {
  const follow = await Follow.findOne({ where: { followerId: req.user.id, followingId: req.params.userId } });
  if (!follow) return res.status(404).json({ message: 'Not following' });
  await follow.destroy();
  res.json({ success: true });
};