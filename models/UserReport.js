'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserReport extends Model {
    static associate(models) {
      // Report is created by a user (reporter)
      UserReport.belongsTo(models.User, {
        foreignKey: 'reporter_id',
        as: 'reporter',
      });

      // Report is linked to a user (talent side)
      UserReport.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'talent',
      });
    }
  }

  UserReport.init(
    {
      reporter_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // if Talent is users table
          key: 'id',
        },
      },
      report_type: {
        type: DataTypes.ENUM(
          'Harassment',
          'Spam',
          'Inappropriate Language',
          'Abuse',
          'Other'
        ),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'reviewed', 'resolved', 'dismissed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      admin_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'UserReport',
      tableName: 'userreports',
      paranoid: true,
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return UserReport;
};
