/**
 * Twilio Function: Email Validation
 * Validates email addresses using SendGrid Validation API
 *
 * Expected request:
 * - event.email_address: Email address to validate
 *
 * Response format:
 * - { valid: true, message: 'Valid email address' } on success
 * - { valid: false, message: 'Error description' } on failure
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
    // Validate input
    if (!event.email_address || event.email_address.length > 254) {
      response.setStatusCode(200);
      response.setBody({
        valid: false,
        message: 'Please enter a valid email address'
      });
      return callback(null, response);
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.email_address)) {
      response.setStatusCode(200);
      response.setBody({
        valid: false,
        message: 'Please enter a valid email address'
      });
      return callback(null, response);
    }

    // Load SendGrid client helper
    const sendgridClient = require(Runtime.getFunctions()['helpers/sendgrid-client'].path);

    // Call SendGrid Validation API
    const result = await sendgridClient.validateEmail(context, event.email_address);

    // Parse SendGrid response
    // SendGrid returns response.data with validation results
    const validationData = result.data?.result;

    if (validationData && validationData.verdict === 'Valid') {
      response.setStatusCode(200);
      response.setBody({
        valid: true,
        message: 'Valid email address'
      });
    } else {
      // Extract reason from SendGrid response
      const reason = validationData?.checks?.domain?.error ||
                     validationData?.checks?.local_part?.error ||
                     'Email address validation failed';

      response.setStatusCode(200);
      response.setBody({
        valid: false,
        message: reason
      });
    }

    return callback(null, response);
  } catch (error) {
    // Log error server-side only
    console.error('Email validation error:', {
      code: error.code,
      status: error.status
    });

    // Return generic error message to client
    response.setStatusCode(200);
    response.setBody({
      valid: false,
      message: 'Unable to validate email address. Please try again.'
    });

    return callback(null, response);
  }
};
