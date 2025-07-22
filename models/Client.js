const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
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
  businessName: {
    type: String,
  },
  interests: [{
    type: String,
  }],
  about: {
    type: String,
    maxlength: [500, 'About cannot be more than 500 characters'],
  },
  profilePhoto: {
    type: String,
    default: 'default.jpg',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Client', clientSchema);