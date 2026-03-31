const twilioClientPath = Runtime.getFunctions()['helpers/twilio-client'].path;
const twilioClient = require(twilioClientPath);

const businessLogicPath = Runtime.getFunctions()['helpers/business-logic'].path;
const businessLogic = require(businessLogicPath);

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
    // Validate required parameters
    if (!event.mobile_number || !/^\+[1-9]\d{1,14}$/.test(event.mobile_number)) {
      response.setStatusCode(400);
      response.setBody({
        success: false,
        message: 'Invalid phone number'
      });
      return callback(null, response);
    }

    // Sanitize and validate user data
    const userData = {
      first_name: (event.first_name || '').replace(/[^a-zA-Z\s'-]/g, '').substring(0, 50),
      last_name: (event.last_name || '').replace(/[^a-zA-Z\s'-]/g, '').substring(0, 50),
      address: (event.address || '').substring(0, 200),
      city: (event.city || '').substring(0, 100),
      state: (event.state || '').substring(0, 50),
      postal_code: (event.postal_code || '').replace(/[^\d-]/g, '').substring(0, 10),
      date_of_birth: (event.date_of_birth && /^\d{4}-\d{2}-\d{2}$/.test(event.date_of_birth))
        ? event.date_of_birth
        : ''
    };

    // Debug: Log user data being sent
    console.log('User data sent to Lookup v2:', JSON.stringify(userData, null, 2));

    // Call Lookup v2 API
    const lookupResult = await twilioClient.lookupV2(context, event.mobile_number, userData);

    // Debug: Log raw API response
    console.log('Lookup v2 raw response:', JSON.stringify(lookupResult, null, 2));

    // Transform the response using business logic
    const transformedData = businessLogic.transformLookupV2Data(lookupResult);

    // Debug: Log transformed data
    console.log('Transformed data:', JSON.stringify(transformedData, null, 2));

    // Return success response
    response.setStatusCode(200);
    response.setBody({
      success: true,
      data: transformedData
    });

    return callback(null, response);
  } catch (error) {
    // Log error server-side only
    console.error('Lookup v2 endpoint error:', {
      code: error.code,
      status: error.status
    });

    // Return generic error message to client
    response.setStatusCode(500);
    response.setBody({
      success: false,
      message: 'Unable to perform lookup. Please try again.'
    });

    return callback(null, response);
  }
};
