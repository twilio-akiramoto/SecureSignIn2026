var twilio = require("../services/twilio");
var sendgrid = require("../services/sendgrid");
var business = require("../business/business");

require('dotenv').config();

var appRouter = function(app) {
  app.get("/", (req, res) => res.render("pages/index"));

  app.post("/phone_verification", (req, res) => {
    const userData = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      postal_code: req.body.postal_code,
      country: req.body.country,
      date_of_birth: req.body.date_of_birth,
      email_address: req.body.email_address,
      mobile_phone_number: req.body.mobile_phone_number
    };

    // Call Twilio Lookup v2 with Identity Match
    twilio.lookupV2(userData.mobile_phone_number, userData)
      .then(lookupResponse => {
        // Transform and store in session
        userData.lookup_results = business.transformLookupV2Data(lookupResponse);
        req.session.userData = userData;

        // Send verification SMS (existing flow)
        return twilio.verify(userData.mobile_phone_number);
      })
      .then(() => {
        // Render phone verification page
        res.render("pages/phone_verification", {
          formData: userData
        });
      })
      .catch(error => {
        console.error('Lookup v2 error:', error);
        // Even if lookup fails, continue with verification
        req.session.userData = userData;
        twilio.verify(userData.mobile_phone_number)
          .then(() => {
            res.render("pages/phone_verification", {
              formData: userData
            });
          })
          .catch(verifyError => {
            console.error('Verification error:', verifyError);
            res.status(500).send('Error processing signup');
          });
      });
  });

  app.get("/preferences", (req, res) => {
    res.render("pages/preferences");
  });

  app.get("/lookup-results", (req, res) => {
    // Check if session data exists
    if (!req.session.userData || !req.session.userData.lookup_results) {
      return res.redirect("/");
    }

    res.render("pages/lookup_results", {
      userData: req.session.userData,
      lookupData: req.session.userData.lookup_results
    });
  });

  app.get("/lookup", function(req, res) {
    twilio.lookup(req.query.mobile_number).then(data => {
      var response = business.transformLookupData(data);
      res.json(response);
    });
  });

  app.get("/email_validation", function(req, res) {
    sendgrid.validation(req.query.email_address).then(data => {
      var response = business.transformEmailValidationData(data);
      res.json(response);
    });
  });

  app.get("/verify", function(req, res) {
    twilio.verify(req.query.mobile_number).then(data => {
      res.json(data);
    });
  });

  app.get("/verifyCheck", function(req, res) {
    twilio
      .verifyCheck(req.query.mobile_number, req.query.verification_code)
      .then(data => {
        var response = business.transformVerificationCheckData(data);
        res.json(response);
      })
      .catch(error => {
        res.send("Invalid or previously used code");
      });
  });

  app.get("/email/:template/:email_address", function(req, res) {
    let template_id = null;
    switch (req.params.template) {
      case "order-confirmation":
        template_id = process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID;
        break;
      case "fraud-alert":
        template_id = process.env.SENDGRID_FRAUD_ALERT_TEMPLATE_ID;
        break;
    }
    if (template_id != null) {
      sendgrid.send(req.params.email_address, template_id).then(response => {
        res.json(response);
      });
    }
  });

  app.get("/sms/:template/:phone_number", function(req, res) {
    let message = null;
    switch (req.params.template) {
      case "order-confirmation":
        message = "Owl Demo Order Confirmation.  Your order number is 8675309.";
        break;
      case "fraud-alert":
        message = "Owl Demo Fraud Alert.  We recently detected fraudulent activity on your account.  Please panic!";
        break;
    }
    if (message != null) {
      twilio.sendSMS(req.params.phone_number, message).then(response => {
        res.json(response);
      });
    }
  });

  app.get("/call/:template/:phone_number", function(req, res) {
    let url = null;
    switch (req.params.template) {
      case "order-confirmation":
        url = "https://handler.twilio.com/twiml/EH10ddde0db8be18bb5e864f53fc45f1bf";
        break;
      case "fraud-alert":
        url = "https://handler.twilio.com/twiml/EH80b05ba088ad47b84e99f253563c602e";
        break;
    }
    if (url != null) {
      twilio.sendCall(req.params.phone_number, url).then(response => {
        res.json(response);
      });
    }
  });
};

module.exports = appRouter;
