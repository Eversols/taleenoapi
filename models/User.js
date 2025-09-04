'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Define associations here
      User.hasOne(models.Talent, { foreignKey: 'user_id', as: 'talent' });
      User.hasOne(models.Client, { foreignKey: 'user_id', as: 'client' });
      User.hasMany(models.Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
      User.hasMany(models.Review, { foreignKey: 'reviewer_id', as: 'reviewsGiven' });
      User.hasMany(models.Review, { foreignKey: 'reviewed_id', as: 'reviewsReceived' });
      User.hasMany(models.Message, { foreignKey: 'sender_id', as: 'sentMessages' });
      User.hasMany(models.Message, { foreignKey: 'receiver_id', as: 'receivedMessages' });
      User.hasMany(models.Report, { foreignKey: 'reporter_id', as: 'reportsMade' });
      User.hasMany(models.Report, { foreignKey: 'reported_id', as: 'reportsReceived' });
      User.hasMany(models.Block, { foreignKey: 'blocker_id', as: 'blockedUsers' });
      User.hasMany(models.Block, { foreignKey: 'blocked_id', as: 'blockedByUsers' });
      User.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
    }

    static async findByCredentials(username, password) {
      const user = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email: username }]
        }
      });

      if (!user) {
        throw new Error('Unable to login');
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        throw new Error('Unable to login');
      }

      return user;
    }

    toJSON() {
      const values = Object.assign({}, this.get());
      delete values.password;
      delete values.verification_code;
      delete values.verification_code_expire;
      delete values.reset_password_token;
      delete values.reset_password_expire;
      return values;
    }
  }

  User.init({
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 255]
      }
    },
    role: {
      type: DataTypes.ENUM('client', 'talent', 'admin'),
      allowNull: false,
      defaultValue: 'client'
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verification_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    verification_code_expire: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reset_password_expire: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    on_board: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    notification_alert: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    views: {
      type: DataTypes.INTEGER,   // or BIGINT if you expect huge counts
      allowNull: false,
      defaultValue: 0
    },
    is_blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indicates if user is blocked (true) or active (false)'
    },
    availability: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    paranoid: true,
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 8);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 8);
        }
      }
    }
  });

  return User;
};