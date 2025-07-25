// models/talentcategory.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TalentCategory extends Model {
    static associate(models) {
      TalentCategory.hasMany(models.Talent, {
        foreignKey: 'categoryId'
      });
    }
  }
  TalentCategory.init({
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'TalentCategory',
  });
  return TalentCategory;
};