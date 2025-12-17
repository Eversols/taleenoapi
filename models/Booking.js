'use strict';

module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    client_id: DataTypes.INTEGER,
    talent_id: DataTypes.INTEGER,
    skill_id: DataTypes.INTEGER,
    created_at: DataTypes.DATEONLY,
    time_slot: DataTypes.STRING,
    note: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM('pending','accepted', 'paymentPending','rejected','inProgress', 'completed','reviewPending','requestedForRescheduleByUser','requestedForRescheduleByTalent','canceledByUser','canceledByTalent','isPaid','confirm','talentreviewpending','clientreviewpending'),
      defaultValue: 'pending'
    },

    // 🔽 Newly added fields
    feed_id: DataTypes.INTEGER,
    transaction_id: DataTypes.STRING,
    amount: DataTypes.DECIMAL(10, 2),
    currency: DataTypes.STRING,
    payment_status: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      defaultValue: 'pending'
    },
    checkout_id: DataTypes.STRING,
    payment_type: DataTypes.STRING,
    brand: DataTypes.STRING,
    result_code: DataTypes.STRING,
    result_description: DataTypes.TEXT,
    booking_date: DataTypes.DATEONLY
    // 🔼
  }, {
    tableName: 'bookings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Booking.associate = (models) => {
    Booking.belongsTo(models.Client, { foreignKey: 'client_id', as: 'client' });
    Booking.belongsTo(models.Talent, { foreignKey: 'talent_id', as: 'talent' });
    Booking.belongsTo(models.Skill, { foreignKey: 'skill_id', as: 'skill' });
    Booking.hasMany(models.BookingSlot, { foreignKey: 'booking_id', as: 'slots' });
  };

  return Booking;
};
