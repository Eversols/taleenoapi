'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('talents', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'talentcategories', // Make sure this matches your categories table name
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('talents', 'category_id');
  }
};