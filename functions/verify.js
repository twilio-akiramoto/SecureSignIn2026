/**
 * Twilio Function: Send Verification Code
 * Endpoint for sending SMS verification codes via Twilio Verify API
 * Rate limited to 3 attempts per hour per phone number
 */

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  // Secure CORS: Allow same-origin or configured domains only
  const origin = event.request?.headers?.origin || event.request?.headers?.referer;
  const allowedOrigins = context.ALLOWED_ORIGINS
    ? context.ALLOWED_ORIGINS.split(',')
    : [];

  // Allow same domain (Twilio Functions domain)
  if (origin && (origin.includes('.twil.io') || allowedOrigins.includes(origin))) {
    response.appendHeader('Access-Control-Allow-Origin', origin);
    response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  try {
    const twilioClient = require(Runtime.getFunctions()['helpers/twilio-client'].path);

    // Validate input
    if (!event.mobile_number) {
      response.setStatusCode(400);
      response.setBody({
        valid: false,
        message: 'Phone number is required'
      });
      return callback(null, response);
    }

    // Basic phone format validation (E.164)
    if (!/^\+[1-9]\d{1,14}$/.test(event.mobile_number)) {
      response.setStatusCode(400);
      response.setBody({
        valid: false,
        message: 'Invalid phone number format'
      });
      return callback(null, response);
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
    // Log error server-side only
    console.error('Verify endpoint error:', {
      code: error.code,
      status: error.status
    });

    // Return generic error message to client
    response.setStatusCode(500);
    response.setBody({
      valid: false,
      message: 'Unable to send verification code. Please try again.'
    });

    return callback(null, response);
  }
};
