const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  // Personal Information
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  
  // Location Information
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  useCurrentLocation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  searchedLocation: {
    type: DataTypes.STRING
  },
  selectedLocation: {
    type: DataTypes.STRING
  },
  locationDetails: {
    type: DataTypes.JSON
  },
  
  // Professional Information
  languages: {
    type: DataTypes.JSON
  },
  hourlyRate: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  
  // Talent Information
  talentType: {
    type: DataTypes.STRING
  },
  customTalent: {
    type: DataTypes.STRING
  },
  experienceLevel: {
    type: DataTypes.STRING
  },
  
  // Availability
  availabilities: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  // Profile Media
  profilePicture: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'users',
  timestamps: false
});

module.exports = UserProfile;