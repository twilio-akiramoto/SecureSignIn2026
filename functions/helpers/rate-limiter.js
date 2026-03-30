/**
 * Rate Limiter for Twilio Verify API
 * Limits verify calls to 3 per phone number to prevent fraud
 * Uses in-memory storage (will reset on Function cold starts)
 */

// In-memory storage: { phoneNumber: { count: number, resetAt: timestamp } }
const verifyAttempts = new Map();

// Rate limit configuration
const MAX_ATTEMPTS = 3;
const RESET_WINDOW_MS = 3600000; // 1 hour

/**
 * Check if phone number can make a verify request
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Object} - { allowed: boolean, remaining: number, resetAt: Date|null }
 */
function canVerify(phoneNumber) {
  const now = Date.now();
  const record = verifyAttempts.get(phoneNumber);

  // No previous attempts
  if (!record) {
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: null };
  }

  // Reset window expired - clear old record
  if (now >= record.resetAt) {
    verifyAttempts.delete(phoneNumber);
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: null };
  }

  // Within reset window - check count
  if (record.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt)
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - record.count - 1,
    resetAt: new Date(record.resetAt)
  };
}

/**
 * Record a verify attempt
 * @param {string} phoneNumber - E.164 formatted phone number
 */
function recordAttempt(phoneNumber) {
  const now = Date.now();
  const record = verifyAttempts.get(phoneNumber);

  if (!record || now >= record.resetAt) {
    // New record or expired - start fresh
    verifyAttempts.set(phoneNumber, {
      count: 1,
      resetAt: now + RESET_WINDOW_MS
    });
  } else {
    // Increment existing record
    record.count += 1;
    verifyAttempts.set(phoneNumber, record);
  }
}

/**
 * Get current attempt info for a phone number (for debugging)
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Object|null}
 */
function getAttemptInfo(phoneNumber) {
  const record = verifyAttempts.get(phoneNumber);
  if (!record) return null;

  return {
    count: record.count,
    resetAt: new Date(record.resetAt),
    isExpired: Date.now() >= record.resetAt
  };
}

module.exports = {
  canVerify,
  recordAttempt,
  getAttemptInfo,
  MAX_ATTEMPTS,
  RESET_WINDOW_MS
};
