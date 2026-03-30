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
  response.appendHeader('Access-Control-Allow-Origin', '*');

  try {
    // Validate input
    if (!event.email_address) {
      response.setStatusCode(200);
      response.setBody({
        valid: false,
        message: 'Email address is required'
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
    // Return error response
    response.setStatusCode(200);
    response.setBody({
      valid: false,
      message: error.message || 'Email address validation failed'
    });

    return callback(null, response);
  }
};
