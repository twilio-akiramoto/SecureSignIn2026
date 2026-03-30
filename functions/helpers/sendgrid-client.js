/**
 * SendGrid API Client Helper
 * Provides email validation and sending capabilities
 */

const axios = require('axios');

/**
 * Validate email address using SendGrid Validation API
 * @param {Object} context - Twilio Runtime context
 * @param {string} emailAddress - Email address to validate
 * @returns {Promise<Object>}
 */
async function validateEmail(context, emailAddress) {
  const apiKey = context.SENDGRID_VALIDATION_API_KEY;

  try {
    const response = await axios.get(
      `https://api.sendgrid.com/v3/validations/email`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        params: {
          email: emailAddress
        }
      }
    );

    return response;
  } catch (error) {
    console.error('SendGrid validation error:', error);
    throw error;
  }
}

/**
 * Send email using SendGrid template
 * @param {Object} context - Twilio Runtime context
 * @param {string} toEmail - Recipient email address
 * @param {string} templateId - SendGrid template ID
 * @returns {Promise<Object>}
 */
async function sendEmail(context, toEmail, templateId) {
  const apiKey = context.SENDGRID_EMAIL_API_KEY;

  const payload = {
    personalizations: [
      {
        to: [{ email: toEmail }]
      }
    ],
    from: {
      email: 'noreply@example.com', // Update with your verified sender
      name: 'Secure Account Signups'
    },
    template_id: templateId
  };

  try {
    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, statusCode: response.status };
  } catch (error) {
    console.error('SendGrid send error:', error);
    throw error;
  }
}

module.exports = {
  validateEmail,
  sendEmail
};
