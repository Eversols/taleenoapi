'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Country extends Model {
    static associate(models) {
      // define associations here
    }
  }

  Country.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Country',
    tableName: 'countries', // 👈 Use the actual table name from your DB
  });

  return Country;
};
