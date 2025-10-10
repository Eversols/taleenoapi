module.exports = (sequelize, DataTypes) => {
  const BookingReschedule = sequelize.define('BookingReschedule', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    booking_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    requested_by: {
      type: DataTypes.ENUM('client', 'talent'),
      allowNull: false,
    },
    requested_user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    old_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    old_time: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    new_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    new_time: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'booking_reschedules',
    timestamps: true,
  });

  BookingReschedule.associate = (models) => {
    BookingReschedule.belongsTo(models.Booking, {
      foreignKey: 'booking_id',
      onDelete: 'CASCADE',
    });
  };

  return BookingReschedule;
};
