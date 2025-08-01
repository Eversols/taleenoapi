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
      tableName: 'media',
      timestamps: true
    }
  );

  // Define associations here
  Media.associate = (models) => {
    Media.belongsTo(models.Skill, {
      foreignKey: 'skill_id',
      as: 'skill'
    });
  };

  return Media;
};
