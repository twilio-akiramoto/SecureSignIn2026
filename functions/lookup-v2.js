const twilioClientPath = Runtime.getFunctions()['helpers/twilio-client'].path;
const twilioClient = require(twilioClientPath);

const businessLogicPath = Runtime.getFunctions()['helpers/business-logic'].path;
const businessLogic = require(businessLogicPath);

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  try {
    // Validate required parameters
    if (!event.mobile_number) {
      throw new Error('Missing required parameter: mobile_number');
    }

    const userData = {
      first_name: event.first_name || '',
      last_name: event.last_name || '',
      address: event.address || '',
      city: event.city || '',
      state: event.state || '',
      postal_code: event.postal_code || '',
      date_of_birth: event.date_of_birth || ''
    };

    // Call Lookup v2 API
    const lookupResult = await twilioClient.lookupV2(context, event.mobile_number, userData);

    // Transform the response using business logic
    const transformedData = businessLogic.transformLookupV2Response(lookupResult);

    // Return success response
    response.setStatusCode(200);
    response.setBody({
      success: true,
      data: transformedData
    });

    return callback(null, response);
  } catch (error) {
    console.error('Lookup v2 endpoint error:', error);
    response.setStatusCode(200);
    response.setBody({
      success: false,
      message: error.message || 'Lookup failed'
    });

    return callback(null, response);
  }
};
