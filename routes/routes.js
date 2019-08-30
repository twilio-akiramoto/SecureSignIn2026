var twilio = require("../services/twilio");
var sendgrid = require("../services/sendgrid");
var business = require("../business/business");

var appRouter = function(app) {
  app.get("/", (req, res) => res.render("pages/index"));

  app.post("/phone_verification", (req, res) => {
    twilio.verify(req.body.mobile_phone_number);
    res.render("pages/phone_verification", {
      formData: req.body
    });
  });

  app.get("/preferences", (req, res) => {
    res.render("pages/preferences");
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
        url = "https://handler.twilio.com/twiml/EHd7eafb019a8f1bd513c7be11ffd21a75";
        break;
      case "fraud-alert":
        url = "https://handler.twilio.com/twiml/EHb33d59a31e326ac0656d9574627ce694";
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
