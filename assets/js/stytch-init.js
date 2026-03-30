(function () {
  /**
   * Stytch Client Initialization
   * Handles device fingerprinting and session management
   * Reference: https://stytch.com/docs/sdks/javascript-sdk
   */

  // Initialize Stytch client (will be loaded from CDN)
  let stytchClient = null;
  let fingerprintId = null;

  /**
   * Initialize Stytch client with public token
   * Call this on page load
   * @returns {Promise<boolean>} - True if initialization succeeded, false otherwise
   */
  async function initStytch(publicToken) {
    try {
      if (!publicToken) {
        console.error('initStytch requires a publicToken argument');
        return false;
      }

      // Load Stytch from CDN (add to HTML: <script src="https://unpkg.com/@stytch/vanilla-js"></script>)
      if (typeof window.stytch === 'undefined') {
        console.error('Stytch SDK not loaded. Include script tag in HTML.');
        return false;
      }

      stytchClient = window.stytch.createClient({
        publicToken: publicToken
      });

      console.log('Stytch client initialized');

      // Generate device fingerprint
      await generateFingerprint();
      return true;
    } catch (error) {
      console.error('Stytch initialization error:', error);
      return false;
    }
  }

  /**
   * Generate device fingerprint
   * Captures device characteristics for bot detection
   */
  async function generateFingerprint() {
    if (!stytchClient) {
      console.error('Stytch client not initialized');
      return;
    }

    try {
      // Generate fingerprint (Stytch SDK will collect device data)
      const result = await stytchClient.deviceFingerprinting.capture();
      if (!result?.device_fingerprint_id) {
        console.error('Fingerprint capture returned no ID');
        return null;
      }
      fingerprintId = result.device_fingerprint_id;

      console.log('Device fingerprint generated successfully');

      // Store in session storage for later use
      sessionStorage.setItem('stytch_fingerprint_id', fingerprintId);

      return fingerprintId;
    } catch (error) {
      console.error('Fingerprint generation error:', error);
      return null;
    }
  }

  /**
   * Get stored fingerprint ID
   * @returns {string|null} - Fingerprint ID or null
   */
  function getFingerprintId() {
    return sessionStorage.getItem('stytch_fingerprint_id');
  }

  /**
   * Get device info for display (non-sensitive)
   * @returns {Object} - Basic device information
   */
  function getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Export functions for use in other scripts
  window.StytchInit = {
    init: initStytch,
    generateFingerprint: generateFingerprint,
    getFingerprintId: getFingerprintId,
    getDeviceInfo: getDeviceInfo
  };
})();
