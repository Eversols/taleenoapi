const { ContactMessage } = require('../models');
exports.submit = async (req, res) => {
  await ContactMessage.create(req.body);
  res.json({ success: true, message: 'Submitted' });
};