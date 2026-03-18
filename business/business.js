module.exports = {
  transformLookupData: function(lookupResponse) {
    console.log(lookupResponse);
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
    console.log(validationResponse);
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
    console.log(verificationCheckResponse);
    if (verificationCheckResponse.valid && verificationCheckResponse.status == "approved") {
      return { "valid": true, "message": "Success", "data": verificationCheckResponse };
    }
    return { "valid": false, "message": "Invalid Code", "data": verificationCheckResponse };
  },

  convertMatchScoreToNumber: function(matchString) {
    if (matchString === null || matchString === undefined) return null;

    switch (matchString) {
      case 'exact_match':
        return 100;
      case 'partial_match':
        return 50;
      case 'no_match':
        return 0;
      default:
        return null;
    }
  },

  transformLookupV2Data: function(lookupResponse) {
    console.log('Lookup v2 Response:', lookupResponse);

    return {
      valid: lookupResponse.valid || false,
      phoneNumber: lookupResponse.phoneNumber || '',

      lineType: {
        carrierName: lookupResponse.lineTypeIntelligence?.carrier_name || 'Unknown',
        phoneType: lookupResponse.lineTypeIntelligence?.type || 'Unknown'
      },

      identityMatch: {
        firstName: this.convertMatchScoreToNumber(lookupResponse.identityMatch?.first_name_match),
        lastName: this.convertMatchScoreToNumber(lookupResponse.identityMatch?.last_name_match),
        address: this.convertMatchScoreToNumber(lookupResponse.identityMatch?.address_lines_match),
        city: this.convertMatchScoreToNumber(lookupResponse.identityMatch?.city_match),
        state: this.convertMatchScoreToNumber(lookupResponse.identityMatch?.state_match),
        postalCode: this.convertMatchScoreToNumber(lookupResponse.identityMatch?.postal_code_match),
        country: this.convertMatchScoreToNumber(lookupResponse.identityMatch?.address_country_match),
        dateOfBirth: this.convertMatchScoreToNumber(lookupResponse.identityMatch?.date_of_birth_match)
      },

      simSwap: {
        swappedInPeriod: lookupResponse.simSwap?.swapped_in_period || false,
        lastSwapDate: lookupResponse.simSwap?.last_sim_swap_date || null,
        period: lookupResponse.simSwap?.swapped_period || '30'
      },

      reassignedNumber: {
        reassignedInPeriod: lookupResponse.reassignedNumber?.reassigned_in_period || false,
        lastReassignedDate: lookupResponse.reassignedNumber?.last_reassigned_date || null,
        period: lookupResponse.reassignedNumber?.reassigned_period || '30'
      }
    };
  }
};
