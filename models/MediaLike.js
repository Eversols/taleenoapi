module.exports = (sequelize, DataTypes) => {
  const MediaLike = sequelize.define('MediaLike', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    media_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'media',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'media_likes',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['media_id', 'user_id'] // prevent duplicate likes
      }
    ]
  });

  return MediaLike;
};
