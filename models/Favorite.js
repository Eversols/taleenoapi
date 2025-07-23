'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Favorite extends Model {
    static associate(models) {
      // Define associations here
      Favorite.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      Favorite.belongsTo(models.Talent, { foreignKey: 'talent_id', as: 'talent' });
    }
  }

  Favorite.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    talent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'talents',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Favorite',
    tableName: 'favorites',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Favorite;
};