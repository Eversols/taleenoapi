module.exports = (sequelize, DataTypes) => {
  const Wishlist = sequelize.define('Wishlist', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    talentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'talent_id',
      references: {
        model: 'Talents',
        key: 'id'
      }
    }
  }, {
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'talentId']
      }
    ]
  });

  return Wishlist;
};