// Create a new migration file: migrations/YYYYMMDD-add-talent-fields.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'talentType', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'customTalent', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'experienceLevel', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'availabilities', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'talentType');
    await queryInterface.removeColumn('users', 'customTalent');
    await queryInterface.removeColumn('users', 'experienceLevel');
    await queryInterface.removeColumn('users', 'availabilities');
  }
};