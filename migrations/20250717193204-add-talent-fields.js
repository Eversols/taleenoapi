'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Talent fields
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
    
    // Availability
    await queryInterface.addColumn('users', 'availabilities', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    });
    
    // Location fields
    await queryInterface.addColumn('users', 'useCurrentLocation', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('users', 'searchedLocation', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('users', 'selectedLocation', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('users', 'locationDetails', {
      type: Sequelize.JSON,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'talentType');
    await queryInterface.removeColumn('users', 'customTalent');
    await queryInterface.removeColumn('users', 'experienceLevel');
    await queryInterface.removeColumn('users', 'availabilities');
    await queryInterface.removeColumn('users', 'useCurrentLocation');
    await queryInterface.removeColumn('users', 'searchedLocation');
    await queryInterface.removeColumn('users', 'selectedLocation');
    await queryInterface.removeColumn('users', 'locationDetails');
  }
};