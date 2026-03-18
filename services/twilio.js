require('dotenv').config();
const client = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

module.exports = {
  lookup: function(phone_number) {
    return new Promise((resolve, reject) => {
      client.lookups
        .phoneNumbers(phone_number)
        .fetch({ type: ["carrier"] })
        .then(json => {
          resolve(json);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  verify: function(phone_number) {
    return new Promise((resolve, reject) => {
      client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: phone_number,
          channel: "sms"
        })
        .then(verification => {
          resolve(verification);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  verifyCheck: function(phone_number, code) {
    return new Promise((resolve, reject) => {
      try {
        client.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: phone_number, code: code })
          .then(verification_check => {
            resolve(verification_check);
          })
          .catch(error => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  },

  sendSMS: function(phone_number, message) {
    return new Promise((resolve, reject) => {
      client.messages
        .create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone_number
        })
        .then(response => {
          resolve(response.sid);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  sendCall: function(phone_number, url) {
    return new Promise((resolve, reject) => {
      client.calls
        .create({
          url: url,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone_number
        })
        .then(response => {
          resolve(response.sid);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  lookupV2: function(phone_number, userData) {
    return new Promise((resolve, reject) => {
      client.lookups.v2
        .phoneNumbers(phone_number)
        .fetch({
          fields: ['line_type_intelligence', 'identity_match', 'sim_swap', 'reassigned_number'],
          // Identity Match parameters
          FirstName: userData.first_name,
          LastName: userData.last_name,
          AddressLine1: userData.address,
          City: userData.city,
          State: userData.state,
          PostalCode: userData.postal_code,
          CountryCode: userData.country,
          DateOfBirth: userData.date_of_birth,
          // SIM Swap and Reassigned Number parameters
          simSwapPeriod: process.env.SIM_SWAP_PERIOD || '30',
          reassignedNumberPeriod: process.env.REASSIGNED_NUMBER_PERIOD || '30'
        })
        .then(json => {
          resolve(json);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
};
