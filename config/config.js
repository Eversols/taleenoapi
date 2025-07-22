module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'cd243fd3gf46j67k8987lk6h453f2d',
  JWT_EXPIRE: '30d',
  COOKIE_EXPIRE: 30,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_EMAIL: process.env.SMTP_EMAIL,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  FROM_EMAIL: process.env.FROM_EMAIL,
  FROM_NAME: process.env.FROM_NAME,
};