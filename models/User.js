const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // adjust this if your db file is different

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  tableName: 'users', // match your DB table name
  timestamps: true,
});

module.exports = User;
