'use strict';

module.exports = (sequelize, DataTypes) => {
  const BookingSlot = sequelize.define('BookingSlot', {
    booking_id: DataTypes.INTEGER,
    slot: DataTypes.STRING,       // Example: "10:00 - 11:00"
    slot_date: DataTypes.DATEONLY // Example: "2025-09-13"
  }, {
    tableName: 'booking_slots',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  BookingSlot.associate = (models) => {
    BookingSlot.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  };

  return BookingSlot;
};
