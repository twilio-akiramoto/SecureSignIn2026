/**
 * Twilio Function: Check Verification Code
 * Endpoint for verifying SMS codes via Twilio Verify API
 * Used by Bootstrap validator - returns {valid: boolean} format
 */

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  try {
    const twilioClient = require(Runtime.getFunctions()['helpers/twilio-client'].path);

    // Validate inputs
    if (!event.mobile_number) {
      throw new Error('Missing required parameter: mobile_number');
    }

    if (!event.verification_code) {
      throw new Error('Missing required parameter: verification_code');
    }

    // Check verification code
    const verificationCheck = await twilioClient.checkVerificationCode(
      context,
      event.mobile_number,
      event.verification_code
    );

    // Check if verification was approved
    if (verificationCheck.status === 'approved') {
      response.setStatusCode(200);
      response.setBody({
        valid: true
      });
      return callback(null, response);
    }

    // Verification failed or expired
    response.setStatusCode(200);
    response.setBody({
      valid: false,
      message: 'Invalid or expired verification code'
    });

    return callback(null, response);
  } catch (error) {
    console.error('Verify check endpoint error:', error);

    response.setStatusCode(200);
    response.setBody({
      valid: false,
      message: error.message || 'Failed to verify code'
    });

    return callback(null, response);
  }
};
