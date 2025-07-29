'use strict';

module.exports = (sequelize, DataTypes) => {
  const Follow = sequelize.define(
    'Follow',
    {
      followerId: DataTypes.INTEGER,
      followingId: DataTypes.INTEGER,
    },
    {
      tableName: 'follows',     // 👈 force Sequelize to use lowercase table name
      timestamps: true,        // 👈 optional, remove if not using createdAt/updatedAt
    }
  );

  return Follow;
};
