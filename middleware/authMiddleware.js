// // const jwt = require('jsonwebtoken');
// // const User = require('../models/UserProfile');

// // module.exports = async (req, res, next) => {
// //   const authHeader = req.headers.authorization;

// //   if (!authHeader || !authHeader.startsWith('Bearer ')) {
// //     return res.status(401).json({ error: 'No token provided' });
// //   }

// //   const token = authHeader.split(' ')[1];
// //   try {
// //     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
// //     console.log("sssssssss"+decoded.userId)
// //     const user = await User.findById(decoded.userId);

// //     if (!user) {
// //       return res.status(404).json({ error: 'User not found' });
// //     }

// //     req.user = user;
// //     next();
// //   } catch (err) {
// //     return res.status(401).json({ error: 'Invalid or expired token' });
// //   }
// // };
// const jwt = require('jsonwebtoken');
// const User = require('../models/UserProfile');
// const { Types } = require('mongoose');

// module.exports = async (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'No token provided' });
//   }

//   const token = authHeader.split(' ')[1];
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//     console.log("Decoded userId:", decoded.userId);

//     // Check if decoded.userId is a valid ObjectId
//     if (!Types.ObjectId.isValid(decoded.userId)) {
//       console.log("Invalid ObjectId format:", decoded.userId);
//       return res.status(401).json({ error: 'Invalid token user ID' });
//     }

//     const user = await User.findById(decoded.userId);
//     console.log("User found:", user);

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     req.user = user;
//     next();
//   } catch (err) {
//     console.error("JWT verification or DB error:", err);
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

const jwt = require('jsonwebtoken');
const User = require('../models/UserProfile'); // Sequelize model or other ORM

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log("Decoded userId:", decoded.userId);

    // For Sequelize (MySQL), find user by primary key:
    const user = await User.findByPk(decoded.userId);

    console.log("User found:", user);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("JWT verification or DB error:", err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
