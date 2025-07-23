'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Talent extends Model {
    static associate(models) {
      // Define associations here
      Talent.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      Talent.hasMany(models.Project, { foreignKey: 'talent_id', as: 'projects' });
      Talent.hasMany(models.Booking, { foreignKey: 'talent_id', as: 'bookings' });
      Talent.hasMany(models.Video, { foreignKey: 'talent_id', as: 'videos' });
      Talent.hasMany(models.Favorite, { foreignKey: 'talent_id', as: 'favorites' });
    }
  }

  Talent.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 13,
        max: 120
      }
    },
    country: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    languages: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    main_talent: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    skills: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    experience_level: {
      type: DataTypes.ENUM('entry', 'intermediate', 'expert'),
      allowNull: false,
      defaultValue: 'entry'
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    about: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    profile_photo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'default.jpg'
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    availability: {
      type: DataTypes.JSON,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Talent',
    tableName: 'talents',
    paranoid: true,
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  return Talent;
};