const client = require("../config/onesignal");
const templates = require("../utils/notificationTemplates");

exports.sendNotificationByTemplate = async ({
  template,
  playerIds,
  variables,
  data = {}
}) => {
  try {
    if (!playerIds?.length || !templates[template]) return;

    const { title, message } = templates[template];

    await client.createNotification({
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: message(variables) },
      data
    });
  } catch (error) {
    console.error("OneSignal Error:", error?.body || error);
  }
};
