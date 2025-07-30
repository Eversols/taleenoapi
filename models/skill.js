'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Skill extends Model {
    static associate(models) {
      // define association here
    }
  }

  Skill.init({
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Skill',
    tableName: 'skills', // 👈 force Sequelize to use this table name
  });

  return Skill;
};
