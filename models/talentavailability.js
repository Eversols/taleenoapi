'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TalentAvailability extends Model {
    static associate(models) {
      TalentAvailability.belongsTo(models.Talent, {
        foreignKey: 'talent_id',
        as: 'talent'
      });
    }
  }

  TalentAvailability.init({
    talent_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TalentAvailability',
    tableName: 'talent_availabilities',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return TalentAvailability;
};
