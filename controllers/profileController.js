// controllers/profileController.js
const UserProfile = require('../models/UserProfile');

exports.completeProfile = async (req, res) => {
  const {
    fullName,
    username,
    phoneNumber,
    gender,
    age,
    country,
    city,
    languages,
    hourlyRate,
    profilePicture,
  } = req.body;

  try {
    // 🔐 Use req.user.id from token
    const userId = req.user.id;

    // Update user's profile
    const [updated] = await UserProfile.update(
      {
        fullName,
        username,
        phoneNumber,
        gender,
        age,
        country,
        city,
        languages: Array.isArray(languages) ? languages.join(', ') : languages,
        hourlyRate,
        profilePicture: profilePicture || null,
      },
      { where: { id: userId } }
    );

    if (updated === 0) {
      return res.status(404).json({ error: 'User not found or no changes made' });
    }

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
