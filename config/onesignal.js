const OneSignal = require("onesignal-node");
require('dotenv').config();
const client = new OneSignal.Client(
  process.env.ONESIGNAL_APP_ID,
  process.env.ONESIGNAL_API_KEY
);

module.exports = client;
