'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Video extends Model {
    static associate(models) {
      // Define associations here
      Video.belongsTo(models.Talent, { foreignKey: 'talent_id', as: 'talent' });
    }
  }

  Video.init({
    talent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'talents',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    video_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        isUrl: true
      }
    },
    thumbnail_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    likes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Video',
    tableName: 'videos',
    paranoid: true,
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  return Video;
};