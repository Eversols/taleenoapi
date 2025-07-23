'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Block extends Model {
    static associate(models) {
      // Define associations here
      Block.belongsTo(models.User, { foreignKey: 'blocker_id', as: 'blocker' });
      Block.belongsTo(models.User, { foreignKey: 'blocked_id', as: 'blocked' });
    }
  }

  Block.init({
    blocker_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    blocked_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Block',
    tableName: 'blocks',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Block;
};