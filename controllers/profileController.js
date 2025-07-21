// controllers/profileController.js
const UserProfile = require('../models/UserProfile');

exports.completeProfile = async (req, res) => {
  // Required fields from original model
  const requiredFields = [
    'fullName', 'username', 'phoneNumber', 'gender', 
    'age', 'country', 'city', 'hourlyRate'
  ];
  
  // Check for missing required fields
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ error: `${field} is required` });
    }
  }

  try {
    const userId = req.user.id;
    const {
      // Original fields
      fullName, username, phoneNumber, gender, age, 
      country, city, languages, hourlyRate, profilePicture,
      
      // New talent fields
      talentType, customTalent, experienceLevel,
      
      // New availability
      availabilities
    } = req.body;

    // Validate talent data if provided
    if (talentType) {
      if (talentType === 'Other' && !customTalent) {
        return res.status(400).json({ error: 'customTalent is required when talentType is Other' });
      }
      if (!experienceLevel) {
        return res.status(400).json({ error: 'experienceLevel is required with talentType' });
      }
    }

    // Validate availabilities if provided
    if (availabilities && !Array.isArray(availabilities)) {
      return res.status(400).json({ error: 'availabilities must be an array' });
    }

    // Prepare update object
    const updateData = {
      fullName,
      username,
      phoneNumber,
      gender,
      age,
      country,
      city,
      hourlyRate,
      languages: languages || null,
      profilePicture: profilePicture || null,
      // New fields (only update if provided)
      ...(talentType && { 
        talentType: talentType === 'Other' ? customTalent : talentType,
        customTalent: talentType === 'Other' ? customTalent : null,
        experienceLevel 
      }),
      ...(availabilities && { availabilities })
    };

    const [updated] = await UserProfile.update(updateData, { 
      where: { id: userId } 
    });

    if (updated === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
