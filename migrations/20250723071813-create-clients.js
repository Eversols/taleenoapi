'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clients', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      full_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      },
      age: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      city: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      business_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      about: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      interests: {
        type: Sequelize.JSON,
        allowNull: true
      },
      profile_photo: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'default.jpg'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('clients');
  }
};