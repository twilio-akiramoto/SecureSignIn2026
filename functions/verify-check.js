/**
 * Twilio Function: Check Verification Code
 * Endpoint for verifying SMS codes via Twilio Verify API
 * Used by Bootstrap validator - returns {valid: boolean} format
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
    const rateLimiter = require(Runtime.getFunctions()['helpers/rate-limiter'].path);

    // Validate inputs
    if (!event.mobile_number || !/^\+[1-9]\d{1,14}$/.test(event.mobile_number)) {
      response.setStatusCode(400);
      response.setBody({
        valid: false,
        message: 'Invalid phone number'
      });
      return callback(null, response);
    }

    if (!event.verification_code || !/^\d{6}$/.test(event.verification_code)) {
      response.setStatusCode(400);
      response.setBody({
        valid: false,
        message: 'Invalid verification code format'
      });
      return callback(null, response);
    }

    // Check rate limit to prevent brute force attacks
    const rateLimitCheck = rateLimiter.canCheck(event.mobile_number);
    if (!rateLimitCheck.allowed) {
      const resetTime = rateLimitCheck.resetAt.toLocaleString();
      response.setStatusCode(429);
      response.setBody({
        valid: false,
        message: `Too many verification attempts. Please try again after ${resetTime}`
      });
      return callback(null, response);
    }

    // Record this check attempt
    rateLimiter.recordCheckAttempt(event.mobile_number);

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
    // Log error server-side only
    console.error('Verify check endpoint error:', {
      code: error.code,
      status: error.status
    });

    // Return generic error message to client
    response.setStatusCode(500);
    response.setBody({
      valid: false,
      message: 'Unable to verify code. Please try again.'
    });

    return callback(null, response);
  }
};
