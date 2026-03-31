/**
 * Business Logic Helper
 * Data transformation and validation logic
 */

/**
 * Transform Lookup v1 response for validation
 * @param {Object} lookupResponse - Twilio Lookup v1 response
 * @returns {Object} - { valid: boolean, message: string, data: Object }
 */
function transformLookupData(lookupResponse) {
  if (!lookupResponse?.carrier) {
    return { valid: false, message: 'Unable to determine carrier information.', data: lookupResponse };
  }

  // Create shallow copy to avoid mutating input
  const carrier = { ...lookupResponse.carrier };
  const response = { ...lookupResponse, carrier };

  if (carrier.type === 'mobile') {
    let message = `Thanks for providing your ${carrier.name} phone number!`;
    return { valid: true, message: message, data: response };
  } else {
    // Normalize carrier names
    switch (carrier.name) {
      case 'Google (Grand Central) BWI - Bandwidth.com - SVR':
        carrier.name = 'Google Voice';
        break;
      case 'AT&T - PSTN':
        carrier.name = 'AT&T';
        break;
      case 'T-Mobile USA, Inc.':
        carrier.name = 'T-Mobile';
        break;
    }

    if (carrier.type === 'voip') {
      carrier.type = 'VoIP';
    }

    let message = `You provided a ${carrier.type} number from ${carrier.name}! Please enter your cell number.`;
    return { valid: false, message: message, data: response };
  }
}

/**
 * Transform SendGrid email validation response
 * @param {Object} validationResponse - SendGrid validation response
 * @returns {Object} - { valid: boolean, message: string, data: Object }
 */
function transformEmailValidationData(validationResponse) {
  if (!validationResponse?.data?.result) {
    return { valid: false, message: 'Unable to validate email address.', data: null };
  }

  let data = validationResponse.data.result;

  if (data.verdict === 'Valid') {
    let message = `Thanks! Your email had a validity rating of ${data.score * 100}`;
    return { valid: true, message: message, data: data };
  } else {
    let message = 'There was an error validating your email address.';

    // Likely typo in domain name
    if (data.suggestion != null) {
      message = `Oops! Looks like you have a typo! Did you mean ${data.local}@${data.suggestion}?`;
      return { valid: false, message: message, data: data };
    }

    // Invalid email syntax
    if (!data.checks.domain.has_valid_address_syntax) {
      message = "The syntax of this email address doesn't look quite right...";
    }

    // Invalid domain (will bounce)
    if (!data.checks.domain.has_mx_or_a_record) {
      message = 'That appears to be an invalid domain';
    }

    // Disposable domain
    if (data.checks.domain.is_suspected_disposable_address) {
      message = `We don't allow sign-ups from ${data.host} because they are typically disposable.`;
    }

    // Distribution list
    if (data.checks.local_part.is_suspected_role_address) {
      message = `Although this appears to be valid, email addresses from ${data.local} are typically distribution groups. We don't allow that here.`;
    }

    // Has bounced from SendGrid
    if (data.checks.additional.has_known_bounces) {
      message = `Our email provider has tried delivering to this address before and it resulted in an error.`;
    }

    // Might bounce
    if (data.checks.additional.has_suspected_bounces) {
      message = `Our email provider thinks sending email to this address may result in a failure because sending emails to other users on this domain has resulted in a bounce.`;
    }

    if (data.verdict === 'Risky' && data.score > 0.5) {
      // We're making the conscious decision here to not reject emails with a risk score > 50%
      return { valid: true, message: message, data: data };
    } else {
      // Anything with a score < 50% or an invalid verdict, fail
      return { valid: false, message: message, data: data };
    }
  }
}

/**
 * Transform Verify check response
 * @param {Object} verificationCheckResponse - Twilio Verify check response
 * @returns {Object} - { valid: boolean, message: string, data: Object }
 */
function transformVerificationCheckData(verificationCheckResponse) {

  if (verificationCheckResponse.valid && verificationCheckResponse.status === 'approved') {
    return { valid: true, message: 'Success', data: verificationCheckResponse };
  }

  return { valid: false, message: 'Invalid Code', data: verificationCheckResponse };
}

/**
 * Convert Identity Match string to numeric score
 * @param {string} matchString - Match result string (exact_match, partial_match, no_match)
 * @returns {number|null} - Numeric score (0-100) or null
 */
function convertMatchScoreToNumber(matchString) {
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
}

/**
 * Transform Lookup v2 response with Identity Match
 * @param {Object} lookupResponse - Twilio Lookup v2 response
 * @returns {Object} - Structured lookup data
 */
function transformLookupV2Data(lookupResponse) {
  // Twilio SDK uses camelCase for property names
  return {
    valid: lookupResponse.valid || false,
    phoneNumber: lookupResponse.phoneNumber || '',

    lineType: {
      carrierName: lookupResponse.lineTypeIntelligence?.carrierName ||
                   lookupResponse.lineTypeIntelligence?.carrier_name || 'Unknown',
      phoneType: lookupResponse.lineTypeIntelligence?.type || 'Unknown'
    },

    identityMatch: {
      firstName: convertMatchScoreToNumber(
        lookupResponse.identityMatch?.firstNameMatch ||
        lookupResponse.identityMatch?.first_name_match
      ),
      lastName: convertMatchScoreToNumber(
        lookupResponse.identityMatch?.lastNameMatch ||
        lookupResponse.identityMatch?.last_name_match
      ),
      address: convertMatchScoreToNumber(
        lookupResponse.identityMatch?.addressLinesMatch ||
        lookupResponse.identityMatch?.address_lines_match
      ),
      city: convertMatchScoreToNumber(
        lookupResponse.identityMatch?.cityMatch ||
        lookupResponse.identityMatch?.city_match
      ),
      state: convertMatchScoreToNumber(
        lookupResponse.identityMatch?.stateMatch ||
        lookupResponse.identityMatch?.state_match
      ),
      postalCode: convertMatchScoreToNumber(
        lookupResponse.identityMatch?.postalCodeMatch ||
        lookupResponse.identityMatch?.postal_code_match
      ),
      country: convertMatchScoreToNumber(
        lookupResponse.identityMatch?.addressCountryMatch ||
        lookupResponse.identityMatch?.address_country_match
      ),
      dateOfBirth: convertMatchScoreToNumber(
        lookupResponse.identityMatch?.dateOfBirthMatch ||
        lookupResponse.identityMatch?.date_of_birth_match
      )
    },

    simSwap: {
      swappedInPeriod: lookupResponse.simSwap?.swappedInPeriod ||
                       lookupResponse.simSwap?.swapped_in_period || false,
      lastSwapDate: lookupResponse.simSwap?.lastSimSwapDate ||
                    lookupResponse.simSwap?.last_sim_swap_date || null,
      period: lookupResponse.simSwap?.swappedPeriod ||
              lookupResponse.simSwap?.swapped_period || '30'
    },

    reassignedNumber: {
      reassignedInPeriod: lookupResponse.reassignedNumber?.reassignedInPeriod ||
                          lookupResponse.reassignedNumber?.reassigned_in_period || false,
      lastReassignedDate: lookupResponse.reassignedNumber?.lastReassignedDate ||
                          lookupResponse.reassignedNumber?.last_reassigned_date || null,
      period: lookupResponse.reassignedNumber?.reassignedPeriod ||
              lookupResponse.reassignedNumber?.reassigned_period || '30'
    }
  };
}

module.exports = {
  transformLookupData,
  transformEmailValidationData,
  transformVerificationCheckData,
  convertMatchScoreToNumber,
  transformLookupV2Data
};
