module.exports = {
  transformLookupData: function(lookupResponse) {
    if (lookupResponse.carrier.type === "mobile") {
      let message = `Thanks for providing your ${lookupResponse.carrier.name} phone number!`;
      return { "valid": true, "message": message, "data": lookupResponse };
    } else {
      switch (lookupResponse.carrier.name) {
        case "Google (Grand Central) BWI - Bandwidth.com - SVR":
          lookupResponse.carrier.name = "Google Voice";
          break;
        case "AT&T - PSTN":
          lookupResponse.carrier.name = "AT&T";
          break;
        case "T-Mobile USA, Inc.":
          lookupResponse.carrier.name = "T-Mobile";
          break;
      }
      if (lookupResponse.carrier.type === "voip") lookupResponse.carrier.type = "VoIP";

      let message = `You provided a ${lookupResponse.carrier.type} number from ${lookupResponse.carrier.name}!  Please enter your cell number.`;
      return { "valid": false, "message": message, "data": lookupResponse };
    }
  },

  transformEmailValidationData: function(validationResponse) {
    let data = validationResponse.data.result;

    if (data.verdict == "Valid") {
      let message = `Thanks!  Your email had a validitiy rating of ${data.score * 100}`;
      return { "valid": true, "message": message, "data": data };
    } else {
      let message = "There was an error validating your email address.";

      // likely typo in domain name
      if (data.suggestion != null) {
        message = `Oops!  Looks like you have a typo!  Did you mean ${data.local}@${data.suggestion}?`;
        return { "valid": false, "message": message, "data": data };
      }

      // invalid email syntax
      if (!data.checks.domain.has_valid_address_syntax) message = "The syntax of this email address doesn't look quite right...";

      // invalid domain (will bounce)
      if (!data.checks.domain.has_mx_or_a_record) message = "That appears to be an invalid domain";

      // disposable domain
      if (data.checks.domain.is_suspected_disposable_address) message = `We don't allow sign-ups from ${data.host} because they are typically disposable.`;

      // distribution list
      if (data.checks.local_part.is_suspected_role_address)
        message = `Although this appears to be valid, email addresses from ${data.local} are typically distribution groups.  We don't allow that here.`;

      // has bounced from sendgrid
      if (data.checks.additional.has_known_bounces) message = `Our email provider has tried delivering to this address before and it resulted in an error.`;

      // might bounce
      if (data.checks.additional.has_suspected_bounces)
        message = `Our email provider thinks sending email to this address may result in a failure because sending emails to other users on this domain has resulted in a bounce.`;

      if (data.verdict == "Risky" && data.score > 0.5) {
        // we're making the concious decision here to not reject emails with a risk score > 50%
        return { "valid": true, "message": message, "data": data };
      } else {
        // anything with a score < 50% or an invalid verdict, fail
        return { "valid": false, "message": message, "data": data };
      }
    }
  },

  transformVerificationCheckData: function(verificationCheckResponse) {
    if (verificationCheckResponse.valid && verificationCheckResponse.status == "approved") {
      return { "valid": true, "message": "Success", "data": verificationCheckResponse };
    }
    return { "valid": false, "message": "Invalid Code", "data": verificationCheckResponse };
  }
};
