const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  const { name, username, phoneNumber ,pincode} = req.body;

  // Validate terms agreement
  if (!req.body.termsAgreed) {
    return res.status(400).json({ error: 'You must agree to the terms and conditions' });
  }

  try {
    // Add country code if not already present
    const formattedPhoneNumber = phoneNumber.startsWith('+966') ? phoneNumber : `+966${phoneNumber}`;

    // ✅ Generate 4-digit pincode
    const pincode = Math.floor(1000 + Math.random() * 9000).toString();

    // ✅ Pass pincode explicitly
    const user = await User.create({
      name,
      username,
      phoneNumber: formattedPhoneNumber,
      pincode, // Required to avoid the notNull error
    });

    res.status(201).json({ user, pincode });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// exports.login = async (req, res) => {
//   const { phoneNumber } = req.body;

//   if (!phoneNumber) {
//     return res.status(400).json({ error: 'Phone number is required' });
//   }

//   try {
//     const formattedPhoneNumber = phoneNumber.startsWith('+966') ? phoneNumber : `+966${phoneNumber}`;

//     const user = await User.findOne({
//       where: { phoneNumber: formattedPhoneNumber },
//       order: [['createdAt', 'DESC']], // optional: if multiple, get latest user record by createdAt
//     });

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Send back user info and latest pincode stored in DB
//     res.json({
//       user,
//       pincode: user.pincode,  // assuming `pincode` is stored on user model
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };
exports.login = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const formattedPhoneNumber = phoneNumber.startsWith('+966') ? phoneNumber : `+966${phoneNumber}`;

    const user = await User.findOne({ where: { phoneNumber: formattedPhoneNumber } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new 4-digit pincode
    const newPincode = Math.floor(1000 + Math.random() * 9000).toString();

    // Update user with new pincode
    user.pincode = newPincode;
    await user.save();

    res.json({
      user,
      pincode: newPincode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


exports.verifyByPincode = async (req, res) => {
  const { pincode } = req.body;

  if (!pincode) {
    return res.status(400).json({ error: 'Pincode is required' });
  }

  try {
    const user = await User.findOne({
      where: { pincode }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid pincode' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '1d',
    });

    res.json({
      message: 'Pincode verified successfully',
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
