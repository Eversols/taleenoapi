var rp = require("request-promise");
class Taqnyat {
  constructor(bearerTokens, sender) {
    this._bearerTokens = bearerTokens;
    this._sender = sender;
  }

  async sendSMS(message, recipients, options) {
    const requestbody = {
      sender: this._sender,
      body: message,
      recipients: recipients,
    };

    var options = {
      method: "POST",
      uri: "https://api.taqnyat.sa/v1/messages",
      body: requestbody,
      auth: {
        bearer: this._bearerTokens,
      },
      json: true, // Automatically stringifies the body to JSON
    };

    let result =  await rp(options).then(
      function (res) {
        return res;
      },
      function (err) {
        return err.error;
      }
    );

    return result;
  }
}
module.exports = {
  Taqnyat: Taqnyat,
};
