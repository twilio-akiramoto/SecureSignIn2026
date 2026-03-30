/**
 * Stytch Client Helper
 * Device fingerprinting and bot detection integration
 * Reference: https://stytch.com/docs/sdks/javascript-sdk
 */

const axios = require('axios');

/**
 * Validate Stytch session and get device fingerprint data
 * @param {Object} context - Twilio Runtime context
 * @param {string} sessionToken - Stytch session token from client
 * @returns {Promise<Object>} - Device fingerprint and bot detection results
 */
async function validateSession(context, sessionToken) {
  const projectId = context.STYTCH_PROJECT_ID;
  const secret = context.STYTCH_SECRET;

  try {
    const response = await axios.post(
      `https://api.stytch.com/v1/sessions/authenticate`,
      { session_token: sessionToken },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        auth: {
          username: projectId,
          password: secret
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Stytch session validation error:', error);
    throw error;
  }
}

/**
 * Get device fingerprint results from Stytch
 * @param {Object} context - Twilio Runtime context
 * @param {string} fingerprintId - Device fingerprint ID from Stytch client
 * @returns {Promise<Object>} - Fingerprint analysis results
 */
async function getDeviceFingerprint(context, fingerprintId) {
  const projectId = context.STYTCH_PROJECT_ID;
  const secret = context.STYTCH_SECRET;

  try {
    const response = await axios.get(
      `https://api.stytch.com/v1/device_fingerprints/${fingerprintId}`,
      {
        auth: {
          username: projectId,
          password: secret
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Stytch fingerprint fetch error:', error);
    throw error;
  }
}

/**
 * Transform Stytch fingerprint data for display
 * @param {Object} fingerprintData - Raw Stytch fingerprint response
 * @returns {Object} - Structured data for display
 */
function transformFingerprintData(fingerprintData) {
  return {
    deviceId: fingerprintData.device_fingerprint_id || 'Unknown',
    riskAssessment: {
      botDetected: fingerprintData.risk_assessment?.bot_detected || false,
      riskScore: fingerprintData.risk_assessment?.risk_score || 0,
      riskLevel: fingerprintData.risk_assessment?.risk_level || 'low'
    },
    deviceInfo: {
      userAgent: fingerprintData.device_info?.user_agent || 'Unknown',
      ipAddress: fingerprintData.device_info?.ip_address || 'Unknown',
      browser: fingerprintData.device_info?.browser || 'Unknown',
      operatingSystem: fingerprintData.device_info?.operating_system || 'Unknown',
      deviceType: fingerprintData.device_info?.device_type || 'Unknown'
    },
    timestamp: fingerprintData.created_at || new Date().toISOString()
  };
}

module.exports = {
  validateSession,
  getDeviceFingerprint,
  transformFingerprintData
};
