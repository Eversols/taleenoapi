'use strict';

module.exports = (sequelize, DataTypes) => {
  const Like = sequelize.define('Like', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    talent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('like', 'unlike'),
      allowNull: false,
    }
  }, {
    tableName: 'likes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'talent_id']
      }
    ]
  });

  Like.associate = (models) => {
    Like.belongsTo(models.User, { foreignKey: 'user_id' });
    Like.belongsTo(models.Talent, { foreignKey: 'talent_id' });
  };

  return Like;
};
