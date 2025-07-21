const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  // Existing fields (keeping all your current required fields)
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  languages: {
    type: DataTypes.JSON,
    allowNull: true, // Keeping as optional
  },
  hourlyRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true, // Keeping as optional
  },
  
  // New talent-related fields (making them optional initially)
  talentType: {
    type: DataTypes.STRING,
    allowNull: true, // Will make false after migration
    defaultValue: null
  },
  customTalent: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  experienceLevel: {
    type: DataTypes.STRING,
    allowNull: true, // Will make false after migration
    defaultValue: null
  },
  
  // New availability field (JSON format)
  availabilities: {
    type: DataTypes.JSON,
    allowNull: true, // Will make false after migration
    defaultValue: []
  }
}, {
  tableName: 'users',
  timestamps: false
});

module.exports = UserProfile;