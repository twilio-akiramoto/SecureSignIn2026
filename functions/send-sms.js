/**
 * Send SMS Function
 * Sends SMS using Twilio Messaging API
 */

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  try {
    // Validate inputs
    if (!event.sms_type) {
      throw new Error('Missing required parameter: sms_type');
    }
    if (!event.phone_number) {
      throw new Error('Missing required parameter: phone_number');
    }

    // Load Twilio helper
    const twilioClient = require(Runtime.getFunctions()['helpers/twilio-client'].path);

    // Determine message based on SMS type
    let message;
    if (event.sms_type === 'order-confirmation') {
      message = 'Your order has been confirmed!';
    } else if (event.sms_type === 'fraud-alert') {
      message = 'Fraud alert: suspicious activity detected on your account.';
    } else {
      throw new Error(`Invalid sms_type: ${event.sms_type}`);
    }

    // Send SMS
    const messageSid = await twilioClient.sendSMS(context, event.phone_number, message);

    response.setStatusCode(200);
    response.setBody({
      success: true,
      message: `SMS sent successfully to ${event.phone_number}`,
      messageSid: messageSid
    });

    return callback(null, response);
  } catch (error) {
    console.error('Error sending SMS:', error);
    response.setStatusCode(500);
    response.setBody({
      success: false,
      message: error.message || 'Failed to send SMS'
    });

    return callback(null, response);
  }
};
