/**
 * Twilio Function: Send Verification Code
 * Endpoint for sending SMS verification codes via Twilio Verify API
 * Rate limited to 3 attempts per hour per phone number
 */

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  try {
    const twilioClient = require(Runtime.getFunctions()['helpers/twilio-client'].path);

    // Validate input
    if (!event.mobile_number) {
      throw new Error('Missing required parameter: mobile_number');
    }

    // Send verification code (includes rate limiting)
    const result = await twilioClient.sendVerificationCode(context, event.mobile_number);

    // Check if rate limited
    if (!result.success) {
      response.setStatusCode(200);
      response.setBody({
        valid: false,
        message: result.error,
        rateLimitInfo: result.rateLimitInfo
      });
      return callback(null, response);
    }

    // Success
    response.setStatusCode(200);
    response.setBody({
      valid: true,
      message: 'Verification code sent successfully',
      rateLimitInfo: result.rateLimitInfo
    });

    return callback(null, response);
  } catch (error) {
    console.error('Verify endpoint error:', error);

    response.setStatusCode(200);
    response.setBody({
      valid: false,
      message: error.message || 'Failed to send verification code'
    });

    return callback(null, response);
  }
};
