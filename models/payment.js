module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define("Payment", {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "SAR"
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "PENDING"
    },
    checkout_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    payment_type: {
      type: DataTypes.STRING,
      defaultValue: "DB"
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    result_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    result_description: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: "payments",
    timestamps: true
  });

  return Payment;
};
