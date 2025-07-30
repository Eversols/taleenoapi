'use strict';

module.exports = (sequelize, DataTypes) => {
  const Level = sequelize.define('Level', {
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
  }, {
    tableName: 'levels',
    underscored: true,
  });

  return Level;
};
