// models/contactmessage.js
module.exports = (sequelize, DataTypes) => {
  const ContactMessage = sequelize.define(
    'ContactMessage',
    {
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      subject: DataTypes.STRING,
      message: DataTypes.TEXT,
    },
    {
      tableName: 'contactmessages', // 👈 use exact table name here
      timestamps: true,             // 👈 keep this if you're using createdAt/updatedAt
    }
  );

  return ContactMessage;
};
