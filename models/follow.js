'use strict';
module.exports = (sequelize, DataTypes) => {
  const Follow = sequelize.define('Follow', {
    followerId: DataTypes.INTEGER,
    followingId: DataTypes.INTEGER,
  });
  return Follow;
};