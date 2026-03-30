/**
 * Send Email Function
 * Sends email using SendGrid templates
 */

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  try {
    // Validate inputs
    if (!event.email_type) {
      throw new Error('Missing required parameter: email_type');
    }
    if (!event.email_address) {
      throw new Error('Missing required parameter: email_address');
    }

    // Load SendGrid helper
    const sendgridClient = require(Runtime.getFunctions()['helpers/sendgrid-client'].path);

    // Determine template ID based on email type
    let templateId;
    if (event.email_type === 'order-confirmation') {
      templateId = context.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID;
    } else if (event.email_type === 'fraud-alert') {
      templateId = context.SENDGRID_FRAUD_ALERT_TEMPLATE_ID;
    } else {
      throw new Error(`Invalid email_type: ${event.email_type}`);
    }

    if (!templateId) {
      throw new Error(`Template ID not configured for email_type: ${event.email_type}`);
    }

    // Send email
    const result = await sendgridClient.sendEmail(context, event.email_address, templateId);

    response.setStatusCode(200);
    response.setBody({
      success: true,
      message: `Email sent successfully to ${event.email_address}`,
      statusCode: result.statusCode
    });

    return callback(null, response);
  } catch (error) {
    console.error('Error sending email:', error);
    response.setStatusCode(500);
    response.setBody({
      success: false,
      message: error.message || 'Failed to send email'
    });

    return callback(null, response);
  }
};
