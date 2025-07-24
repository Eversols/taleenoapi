// 'use strict';
// const {
//   Model
// } = require('sequelize');
// module.exports = (sequelize, DataTypes) => {
//   class City extends Model {
//     /**
//      * Helper method for defining associations.
//      * This method is not a part of Sequelize lifecycle.
//      * The `models/index` file will call this method automatically.
//      */
//     static associate(models) {
//       // define association here
//     }
//   }
//   City.init({
//     name: DataTypes.STRING,
//     state_id: DataTypes.INTEGER,
//     state_code: DataTypes.STRING,
//     country_id: DataTypes.INTEGER,
//     country_code: DataTypes.STRING,
//     latitude: DataTypes.STRING,
//     longitude: DataTypes.STRING,
//     flag: DataTypes.BOOLEAN,
//     wikiDataId: DataTypes.STRING
//   }, {
//     sequelize,
//     modelName: 'City',
//   });
//   return City;
// };
// models/city.js
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
  });
  return City;
};
