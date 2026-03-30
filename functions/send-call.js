/**
 * Send Call Function
 * Makes outbound voice call using Twilio Voice API
 */

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  try {
    // Validate inputs
    if (!event.call_type) {
      throw new Error('Missing required parameter: call_type');
    }
    if (!event.phone_number) {
      throw new Error('Missing required parameter: phone_number');
    }

    // Load Twilio helper
    const twilioClient = require(Runtime.getFunctions()['helpers/twilio-client'].path);

    // Determine TwiML URL based on call type
    let twimlUrl;
    if (event.call_type === 'order-confirmation') {
      // Placeholder TwiML URL - can be replaced with custom TwiML endpoint
      twimlUrl = 'https://demo.twilio.com/docs/voice.xml';
      // Alternative: Use environment variable like context.TWIML_ORDER_CONFIRMATION_URL
    } else if (event.call_type === 'fraud-alert') {
      // Fraud alert TwiML bin
      twimlUrl = 'https://handler.twilio.com/twiml/EH80b05ba088ad47b84e99f253563c602e';
    } else {
      throw new Error(`Invalid call_type: ${event.call_type}`);
    }

    // Make call
    const callSid = await twilioClient.makeCall(context, event.phone_number, twimlUrl);

    response.setStatusCode(200);
    response.setBody({
      success: true,
      message: `Call initiated successfully to ${event.phone_number}`,
      callSid: callSid
    });

    return callback(null, response);
  } catch (error) {
    console.error('Error making call:', error);
    response.setStatusCode(500);
    response.setBody({
      success: false,
      message: error.message || 'Failed to initiate call'
    });

    return callback(null, response);
  }
};
