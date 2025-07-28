const { query } = require('../config/db');

/**
 * Sends a JSON response with the given status, message, and data.
 */
const sendJson = (status, message, data = []) => {
  return {
    status,
    message,
    data,
  };
};

/**
 * Sends an exception (can be replaced with Express `next(err)` or manual error throw)
 */
const sendException = (message, errorCode = 500, cause = null) => {
  const error = new Error(message);
  error.status = errorCode;
  error.cause = cause;
  throw error;
};

/**
 * Returns the image path with or without the base URL.
 */
const imageWithPath = (imageName, attachBasePath = false) => {
  if (!imageName) return null;
  return attachBasePath ? `${process.env.BASE_URL}${imageName}` : imageName;
};

/**
 * Generates a random OTP (One-Time Password) of the specified length.
 */
const generateOTP = (length = 4) => {
  if (process.env.APP_MODE === 'development') return '1234';
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
};

/**
 * Returns the full name by combining the first name and last name.
 */
const getFullName = (firstName, lastName) => {
  if (!firstName && !lastName) return 'N/A';
  return [firstName, lastName].filter(Boolean).join(' ');
};

/**
 * Returns the initials by combining the first letter of the first name and last name.
 */
const getInitials = (firstName = '', lastName = '') => {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${firstInitial}${lastInitial}`;
};

/**
 * Checks if a date has passed.
 */
const isDatePassed = (date) => {
  return new Date(date) < new Date();
};

/**
 * MySQL helper to check if a record exists
 */
const recordExists = async (table, field, value) => {
  const sql = `SELECT COUNT(*) as count FROM \`${table}\` WHERE \`${field}\` = ?`;
  const results = await query(sql, [value]);
  return results[0].count > 0;
};

/**
 * MySQL helper to execute a query and handle errors
 */
const executeQuery = async (sql, params = []) => {
  try {
    return await query(sql, params);
  } catch (error) {
    sendException('Database operation failed', 500, error);
  }
};

module.exports = {
  sendJson,
  sendException,
  imageWithPath,
  generateOTP,
  getFullName,
  getInitials,
  isDatePassed,
  recordExists,
  executeQuery,
};
