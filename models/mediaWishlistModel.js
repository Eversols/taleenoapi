'use strict';

module.exports = (sequelize, DataTypes) => {
  const MediaWishlist = sequelize.define(
    'MediaWishlist',
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      media_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
    },
    {
      tableName: 'media_wishlist',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false // If you don’t have an updated_at column
    }
  );

  // Associations
  MediaWishlist.associate = (models) => {
    MediaWishlist.belongsTo(models.Media, {
      foreignKey: 'media_id',
      as: 'media'
    });
    MediaWishlist.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return MediaWishlist;
};
