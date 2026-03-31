/**
 * Twilio API Client Helper
 * Provides methods for Lookup v1, Lookup v2, Verify, and Messaging
 */

// Rate limiter will be loaded lazily when needed
let rateLimiter = null;

function getRateLimiter() {
  if (!rateLimiter) {
    rateLimiter = require(Runtime.getFunctions()['helpers/rate-limiter'].path);
  }
  return rateLimiter;
}

/**
 * Initialize Twilio client from Runtime context
 * @param {Object} context - Twilio Runtime context
 * @returns {Object} - Twilio client instance
 */
function getTwilioClient(context) {
  return context.getTwilioClient();
}

/**
 * Lookup v1 API - Phone number validation with carrier info
 * @param {Object} context - Twilio Runtime context
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Promise<Object>}
 */
async function lookupV1(context, phoneNumber) {
  const client = getTwilioClient(context);

  try {
    const result = await client.lookups.v1
      .phoneNumbers(phoneNumber)
      .fetch({ type: ['carrier'] });
    return result;
  } catch (error) {
    console.error('Lookup v1 error:', error);
    throw error;
  }
}

/**
 * Lookup v2 API - Advanced validation with Identity Match
 * @param {Object} context - Twilio Runtime context
 * @param {string} phoneNumber - E.164 formatted phone number
 * @param {Object} userData - User data for Identity Match
 * @returns {Promise<Object>}
 */
async function lookupV2(context, phoneNumber, userData) {
  const client = getTwilioClient(context);

  // Convert date from YYYY-MM-DD to YYYYMMDD format
  const dateOfBirth = userData.date_of_birth
    ? userData.date_of_birth.replace(/-/g, '')
    : undefined;

  // Build params object, only including non-empty values
  const params = {
    fields: 'line_type_intelligence,identity_match,sim_swap,reassigned_number',
    countryCode: 'US', // Hardcoded to US (country dropdown removed)
    simSwapPeriod: context.SIM_SWAP_PERIOD || '30',
    reassignedNumberPeriod: context.REASSIGNED_NUMBER_PERIOD || '30'
  };

  // Only add identity match fields if they have values
  if (userData.first_name) params.firstName = userData.first_name;
  if (userData.last_name) params.lastName = userData.last_name;
  if (userData.address) params.addressLine1 = userData.address;
  if (userData.city) params.city = userData.city;
  if (userData.state) params.state = userData.state;
  if (userData.postal_code) params.postalCode = userData.postal_code;
  if (dateOfBirth) params.dateOfBirth = dateOfBirth;

  console.log('Lookup v2 params:', JSON.stringify(params, null, 2));

  try {
    const result = await client.lookups.v2
      .phoneNumbers(phoneNumber)
      .fetch(params);
    return result;
  } catch (error) {
    console.error('Lookup v2 error:', error);
    throw error;
  }
}

/**
 * Verify API - Send verification code via SMS
 * @param {Object} context - Twilio Runtime context
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Promise<Object>} - { success: boolean, verification: Object|null, error: string|null }
 */
async function sendVerificationCode(context, phoneNumber) {
  // Check rate limit
  const limiter = getRateLimiter();
  const rateLimitCheck = limiter.canVerify(phoneNumber);

  if (!rateLimitCheck.allowed) {
    const resetTime = rateLimitCheck.resetAt.toLocaleString();
    return {
      success: false,
      verification: null,
      error: `Rate limit exceeded. Maximum ${limiter.MAX_ATTEMPTS} verification attempts allowed. Try again after ${resetTime}`,
      rateLimitInfo: {
        remaining: 0,
        resetAt: rateLimitCheck.resetAt
      }
    };
  }

  // Record attempt BEFORE making API call
  limiter.recordAttempt(phoneNumber);

  const client = getTwilioClient(context);

  try {
    const verification = await client.verify.v2
      .services(context.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({
        to: phoneNumber,
        channel: 'sms'
      });

    return {
      success: true,
      verification: verification,
      error: null,
      rateLimitInfo: {
        remaining: rateLimitCheck.remaining - 1,
        resetAt: null
      }
    };
  } catch (error) {
    console.error('Verify send error:', error);
    throw error;
  }
}

/**
 * Verify API - Check verification code
 * @param {Object} context - Twilio Runtime context
 * @param {string} phoneNumber - E.164 formatted phone number
 * @param {string} code - Verification code
 * @returns {Promise<Object>}
 */
async function checkVerificationCode(context, phoneNumber, code) {
  const client = getTwilioClient(context);

  try {
    const verificationCheck = await client.verify.v2
      .services(context.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: phoneNumber, code: code });
    return verificationCheck;
  } catch (error) {
    console.error('Verify check error:', error);
    throw error;
  }
}

/**
 * Messaging API - Send SMS
 * @param {Object} context - Twilio Runtime context
 * @param {string} to - Recipient phone number
 * @param {string} message - Message body
 * @returns {Promise<string>} - Message SID
 */
async function sendSMS(context, to, message) {
  const client = getTwilioClient(context);

  try {
    const messageResponse = await client.messages.create({
      body: message,
      from: context.TWILIO_PHONE_NUMBER,
      to: to
    });
    return messageResponse.sid;
  } catch (error) {
    console.error('SMS send error:', error);
    throw error;
  }
}

/**
 * Voice API - Make outbound call
 * @param {Object} context - Twilio Runtime context
 * @param {string} to - Recipient phone number
 * @param {string} url - TwiML URL
 * @returns {Promise<string>} - Call SID
 */
async function makeCall(context, to, url) {
  const client = getTwilioClient(context);

  try {
    const call = await client.calls.create({
      url: url,
      from: context.TWILIO_PHONE_NUMBER,
      to: to
    });
    return call.sid;
  } catch (error) {
    console.error('Call error:', error);
    throw error;
  }
}

module.exports = {
  lookupV1,
  lookupV2,
  sendVerificationCode,
  checkVerificationCode,
  sendSMS,
  makeCall
};
