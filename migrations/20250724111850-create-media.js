// File: migrations/20250724111850-create-media.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Media', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: Sequelize.INTEGER,
      title: Sequelize.STRING,
      description: Sequelize.TEXT,
      fileUrl: Sequelize.STRING,
      type: Sequelize.STRING,
      visibility: Sequelize.STRING,
      likes: { type: Sequelize.INTEGER, defaultValue: 0 },
      shares: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Media');
  },
};