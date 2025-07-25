// migrations/xxxx-create-talent-categories.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TalentCategories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    
    // Seed initial categories
    await queryInterface.bulkInsert('TalentCategories', [
      { name: 'Photographer', createdAt: new Date(), updatedAt: new Date() },
      { name: 'DJ', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Hall Dresser', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Violin Player', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Body Art', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Harmonica', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Other', createdAt: new Date(), updatedAt: new Date() }
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TalentCategories');
  }
};