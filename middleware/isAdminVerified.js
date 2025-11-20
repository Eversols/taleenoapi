const { sendJson } = require('../utils/helpers');
module.exports = (req, res, next) => {
  // If user is not logged in
  if (!req.user) {
    return res.status(401).json(
      sendJson(false, 'Unauthorized: No user found')
    );
  }

  // Check admin approval
  if (req.user.is_verified_by_admin === true) {
    return next();
  }
    return res.status(403).json(
      sendJson(false, 'Please contact the administrator for approval of your account.')
    );
};
