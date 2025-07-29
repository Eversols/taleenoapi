'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TalentCategory extends Model {
    static associate(models) {
      // Define association here
      TalentCategory.hasMany(models.Talent, {
        foreignKey: 'categoryId'
      });
    }
  }

  TalentCategory.init(
    {
      name: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'TalentCategory',
      tableName: 'talentcategories', // 👈 Use exact lowercase table name
      timestamps: true             // 👈 Optional: include if you want createdAt/updatedAt
    }
  );

  return TalentCategory;
};
