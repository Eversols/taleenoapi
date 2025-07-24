'use strict';
module.exports = (sequelize, DataTypes) => {
  const Media = sequelize.define('Media', {
    userId: DataTypes.INTEGER,
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    fileUrl: DataTypes.STRING,
    type: DataTypes.STRING,
    visibility: DataTypes.STRING,
    likes: DataTypes.INTEGER,
    shares: DataTypes.INTEGER,
  });
  return Media;
};