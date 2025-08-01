'use strict';

module.exports = (sequelize, DataTypes) => {
  const Media = sequelize.define(
    'Media',
    {
      userId: DataTypes.INTEGER,
      title: DataTypes.STRING,
      description: DataTypes.TEXT,
      fileUrl: DataTypes.STRING,
      type: DataTypes.STRING,
      visibility: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      likes: DataTypes.INTEGER,
      shares: DataTypes.INTEGER,
      skill_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      tableName: 'media',     // 👈 force table name to lowercase
      timestamps: true,       // 👈 keep if you're using createdAt/updatedAt
    }
  );

  return Media;
};
