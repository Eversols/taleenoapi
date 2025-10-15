'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Client extends Model {
    static associate(models) {
      // Define associations here
      Client.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      Client.hasMany(models.Project, { foreignKey: 'client_id', as: 'projects' });
      Client.hasMany(models.Booking, { foreignKey: 'client_id', as: 'bookings' });
      Client.hasMany(models.Favorite, { foreignKey: 'user_id', as: 'favorites' });
    }
  }

  Client.init({
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
      allowNull: true,
      validate: {
        notEmpty: true
      }
    },
    nationality: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        notEmpty: true
      }
    },
    location: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        notEmpty: true
      }
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        notEmpty: true
      }
    },
    business_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    about: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    interests: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    profile_photo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'default.jpg'
    },
    languages: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Client',
    tableName: 'clients',
    paranoid: true,
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  return Client;
};