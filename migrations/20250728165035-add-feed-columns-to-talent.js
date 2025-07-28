'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('talents', 'video_url', {
      type: Sequelize.STRING,
      allowNull: true
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('talents', 'video_url');
  }
};
