const UserProfile = require('../models/UserProfile');
const { Op } = require('sequelize');

// Mock location data for search
const MOCK_LOCATIONS = [
  "Baker Street Library",
  "The Greenleaf Mall",
  "Business Business Park",
  "Business Community Center",
  "7 Hillstreet, Avenue Birmingham, RD 350",
  "United Kingdom",
  "Birmingham City Centre",
  "Ajury Location Access"
];

exports.completeProfile = async (req, res) => {
  const requiredFields = [
    'fullName', 'username', 'phoneNumber', 'gender',
    'age', 'country', 'city', 'hourlyRate'
  ];

  // Validate required fields
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ error: `${field} is required` });
    }
  }

  try {
    const userId = req.user.id;
    const {
      // Personal info
      fullName, username, phoneNumber, gender, age,
      
      // Location
      country, city, useCurrentLocation, searchedLocation, 
      selectedLocation, locationDetails,
      
      // Professional
      languages, hourlyRate, profilePicture,
      
      // Talent
      talentType, customTalent, experienceLevel,
      
      // Availability
      availabilities
    } = req.body;

    // Validate talent data if provided
    if (talentType) {
      if (talentType === 'Other' && !customTalent) {
        return res.status(400).json({ error: 'Custom talent is required when selecting "Other"' });
      }
      if (!experienceLevel) {
        return res.status(400).json({ error: 'Experience level is required' });
      }
    }

    // Validate availability if provided
    if (availabilities && !Array.isArray(availabilities)) {
      return res.status(400).json({ error: 'Availabilities must be an array' });
    }

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
      useCurrentLocation: useCurrentLocation || false,
      ...(searchedLocation && { searchedLocation }),
      ...(selectedLocation && { selectedLocation }),
      ...(locationDetails && { locationDetails }),
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

exports.searchLocations = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = MOCK_LOCATIONS.filter(location =>
      location.toLowerCase().includes(query.toLowerCase())
    );

    res.status(200).json({ locations: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await UserProfile.findOne({ 
      where: { id: userId },
      attributes: { exclude: ['password'] } // Exclude sensitive fields
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};