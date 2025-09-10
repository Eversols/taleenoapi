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
      type: DataTypes.ENUM('pending','accepted', 'paymentPending','rejected','inProgress', 'completed','reviewPending','requestedForRescheduleByUser','requestedForRescheduleByTalent','canceledByUser','canceledByTalent','isPaid','confirm'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'bookings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Booking.associate = (models) => {
    Booking.belongsTo(models.User, { foreignKey: 'client_id', as: 'client' });
    Booking.belongsTo(models.User, { foreignKey: 'talent_id', as: 'talent' });
    Booking.belongsTo(models.Skill, { foreignKey: 'skill_id', as: 'skill' });
  };

  return Booking;
};
