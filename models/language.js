'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Language extends Model {
    static associate(models) {
      // define association here if needed
    }
  }

  Language.init({
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Language',
    tableName: 'languages', // 👈 Force Sequelize to use the exact table name
  });

  return Language;
};
