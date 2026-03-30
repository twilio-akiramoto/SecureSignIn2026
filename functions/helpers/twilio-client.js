/**
 * Twilio API Client Helper
 * Provides methods for Lookup v1, Lookup v2, Verify, and Messaging
 */

const rateLimiter = require('./rate-limiter');

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

  try {
    const result = await client.lookups.v2
      .phoneNumbers(phoneNumber)
      .fetch({
        fields: 'line_type_intelligence,identity_match,sim_swap,reassigned_number',
        firstName: userData.first_name,
        lastName: userData.last_name,
        addressLine1: userData.address,
        city: userData.city,
        state: userData.state,
        postalCode: userData.postal_code,
        countryCode: 'US', // Hardcoded to US (country dropdown removed)
        dateOfBirth: dateOfBirth,
        simSwapPeriod: context.SIM_SWAP_PERIOD || '30',
        reassignedNumberPeriod: context.REASSIGNED_NUMBER_PERIOD || '30'
      });
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
  const rateLimitCheck = rateLimiter.canVerify(phoneNumber);

  if (!rateLimitCheck.allowed) {
    const resetTime = rateLimitCheck.resetAt.toLocaleString();
    return {
      success: false,
      verification: null,
      error: `Rate limit exceeded. Maximum ${rateLimiter.MAX_ATTEMPTS} verification attempts allowed. Try again after ${resetTime}`,
      rateLimitInfo: {
        remaining: 0,
        resetAt: rateLimitCheck.resetAt
      }
    };
  }

  const client = getTwilioClient(context);

  try {
    const verification = await client.verify.v2
      .services(context.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({
        to: phoneNumber,
        channel: 'sms'
      });

    // Record successful attempt
    rateLimiter.recordAttempt(phoneNumber);

    return {
      success: true,
      verification: verification,
      error: null,
      rateLimitInfo: {
        remaining: rateLimitCheck.remaining,
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
