
const mongoose = require('mongoose');

const talentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
    required: [true, 'Please provide your full name'],
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  age: {
    type: Number,
    min: [18, 'Age must be at least 18'],
  },
  country: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  languages: [{
    type: String,
  }],
  mainTalent: {
    type: String,
    required: true,
  },
  skills: [{
    type: String,
  }],
  experienceLevel: {
    type: String,
    enum: ['entry', 'intermediate', 'expert'],
    default: 'entry',
  },
  hourlyRate: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  availability: [{
    day: {
      type: String,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    },
    slots: [{
      start: String,
      end: String,
    }],
  }],
  about: {
    type: String,
    maxlength: [500, 'About cannot be more than 500 characters'],
  },
  profilePhoto: {
    type: String,
    default: 'default.jpg',
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Talent', talentSchema);