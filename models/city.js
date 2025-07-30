'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class City extends Model {
    static associate(models) {
      // Define relationships if needed
    }
  }

  City.init({
    name: DataTypes.STRING,
    state_id: DataTypes.INTEGER,
    state_code: DataTypes.STRING,
    country_id: DataTypes.INTEGER,
    country_code: DataTypes.STRING,
    latitude: DataTypes.STRING,
    longitude: DataTypes.STRING,
    flag: DataTypes.BOOLEAN,
    wikiDataId: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'City',
    tableName: 'cities' // 👈 Force table name to 'city'
  });

  return City;
};
