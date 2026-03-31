/**
 * Send Email Function
 * Sends email using SendGrid templates
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
    // Validate email type (whitelist)
    const validEmailTypes = ['order-confirmation', 'fraud-alert'];
    if (!event.email_type || !validEmailTypes.includes(event.email_type)) {
      response.setStatusCode(400);
      response.setBody({
        success: false,
        message: 'Invalid email type'
      });
      return callback(null, response);
    }

    // Validate email address
    if (!event.email_address || event.email_address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.email_address)) {
      response.setStatusCode(400);
      response.setBody({
        success: false,
        message: 'Invalid email address'
      });
      return callback(null, response);
    }

    // Load SendGrid helper
    const sendgridClient = require(Runtime.getFunctions()['helpers/sendgrid-client'].path);

    // Get template ID from environment (secure)
    const templateIds = {
      'order-confirmation': context.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID,
      'fraud-alert': context.SENDGRID_FRAUD_ALERT_TEMPLATE_ID
    };

    const templateId = templateIds[event.email_type];
    if (!templateId) {
      throw new Error('Template not configured');
    }

    // Send email
    const result = await sendgridClient.sendEmail(context, event.email_address, templateId);

    response.setStatusCode(200);
    response.setBody({
      success: true,
      message: 'Email sent successfully'
    });

    return callback(null, response);
  } catch (error) {
    // Log error server-side only
    console.error('Error sending email:', {
      code: error.code,
      status: error.status
    });

    // Return generic error message to client
    response.setStatusCode(500);
    response.setBody({
      success: false,
      message: 'Unable to send email. Please try again.'
    });

    return callback(null, response);
  }
};
