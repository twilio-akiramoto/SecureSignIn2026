const axios = require("axios");

const sgAPI = axios.create({
  baseURL: "https://api.sendgrid.com/v3",
  timeout: 10000,
  headers: {
    Authorization: "Bearer " + process.env.SENDGRID_VALIDATION_API_KEY,
    ContentType: "application/json"
  }
});

const sgSendingAPI = axios.create({
  baseURL: "https://api.sendgrid.com/v3",
  timeout: 10000,
  headers: {
    Authorization: "Bearer " + process.env.SENDGRID_EMAIL_API_KEY,
    ContentType: "application/json"
  }
});

module.exports = {
  validation: function(email_address) {
    return new Promise((resolve, reject) => {
      sgAPI
        .post("/validations/email", {
          email: email_address,
          source: "Sign In Demo"
        })
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  send: function(email_address, template_id) {
    return new Promise((resolve, reject) => {
      sgSendingAPI
        .post("/mail/send", {
          "personalizations": [{ "to": [{ "email": email_address }] }],
          "from": {
            "email": "poweredby@owldemo.com"
          },
          "template_id": template_id
        })
        .then(response => {
          if (response.status == 202) resolve({ "success": true });
          else reject(response.statusText);
        })
        .catch(error => {
          reject(error);
        });
    }).catch(error => {
      throw error;
    });
  }
};
