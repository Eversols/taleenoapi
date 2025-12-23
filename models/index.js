'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Load all models first
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Explicitly define City-Country association if not in model files
if (db.City && db.Country) {
  db.City.belongsTo(db.Country, {
    foreignKey: 'country_id',
    as: 'country'
  });

  db.Country.hasMany(db.City, {
    foreignKey: 'country_id',
    as: 'cities'
  });
}

// Define User-Follow associations only after models are loaded
if (db.User && db.Follow) {
  db.User.belongsToMany(db.User, {
    through: db.Follow,
    as: 'following',
    foreignKey: 'followerId',
    otherKey: 'followingId'
  });

  db.User.belongsToMany(db.User, {
    through: db.Follow,
    as: 'followers',
    foreignKey: 'followingId',
    otherKey: 'followerId'
  });

  // Additional direct Follow model associations
  db.Follow.belongsTo(db.User, {
    foreignKey: 'followerId',
    as: 'follower'
  });

  db.Follow.belongsTo(db.User, {
    foreignKey: 'followingId',
    as: 'following'
  });
  db.Media.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'User'
  });

  db.User.hasMany(db.Media, {
    foreignKey: 'userId',
    as: 'media'
  });

}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;