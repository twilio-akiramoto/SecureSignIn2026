/**
 * Rate Limiter for Twilio Verify API
 * Limits verify calls to 3 per phone number to prevent fraud
 * Uses in-memory storage (will reset on Function cold starts)
 */

// In-memory storage: { phoneNumber: { count: number, resetAt: timestamp } }
const verifyAttempts = new Map();
const checkAttempts = new Map();

// Rate limit configuration
const MAX_ATTEMPTS = 3;
const RESET_WINDOW_MS = 3600000; // 1 hour

// Rate limit for verification code checks (prevent brute force)
const MAX_CHECK_ATTEMPTS = 5;
const CHECK_RESET_WINDOW_MS = 900000; // 15 minutes

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
    return { allowed: true, remaining: MAX_ATTEMPTS, resetAt: null };
  }

  // Reset window expired - clear old record
  if (now >= record.resetAt) {
    verifyAttempts.delete(phoneNumber);
    return { allowed: true, remaining: MAX_ATTEMPTS, resetAt: null };
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
    remaining: MAX_ATTEMPTS - record.count,
    resetAt: new Date(record.resetAt)
  };
}

/**
 * Record a verify attempt
 * @param {string} phoneNumber - E.164 formatted phone number
 */
function recordAttempt(phoneNumber) {
  const now = Date.now();

  // Periodic cleanup to prevent unbounded growth
  if (verifyAttempts.size > 10000) {
    for (const [phone, record] of verifyAttempts.entries()) {
      if (now >= record.resetAt) {
        verifyAttempts.delete(phone);
      }
    }
  }

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

/**
 * Check if phone number can attempt verification code check
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Object} - { allowed: boolean, remaining: number, resetAt: Date|null }
 */
function canCheck(phoneNumber) {
  const now = Date.now();
  const record = checkAttempts.get(phoneNumber);

  // No previous attempts
  if (!record) {
    return { allowed: true, remaining: MAX_CHECK_ATTEMPTS, resetAt: null };
  }

  // Reset window expired - clear old record
  if (now >= record.resetAt) {
    checkAttempts.delete(phoneNumber);
    return { allowed: true, remaining: MAX_CHECK_ATTEMPTS, resetAt: null };
  }

  // Within reset window - check count
  if (record.count >= MAX_CHECK_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt)
    };
  }

  return {
    allowed: true,
    remaining: MAX_CHECK_ATTEMPTS - record.count,
    resetAt: new Date(record.resetAt)
  };
}

/**
 * Record a verification check attempt
 * @param {string} phoneNumber - E.164 formatted phone number
 */
function recordCheckAttempt(phoneNumber) {
  const now = Date.now();

  // Periodic cleanup
  if (checkAttempts.size > 10000) {
    for (const [phone, record] of checkAttempts.entries()) {
      if (now >= record.resetAt) {
        checkAttempts.delete(phone);
      }
    }
  }

  const record = checkAttempts.get(phoneNumber);

  if (!record || now >= record.resetAt) {
    // New record or expired - start fresh
    checkAttempts.set(phoneNumber, {
      count: 1,
      resetAt: now + CHECK_RESET_WINDOW_MS
    });
  } else {
    // Increment existing record
    record.count += 1;
  }
}

module.exports = {
  canVerify,
  recordAttempt,
  getAttemptInfo,
  canCheck,
  recordCheckAttempt,
  MAX_ATTEMPTS,
  MAX_CHECK_ATTEMPTS,
  RESET_WINDOW_MS,
  CHECK_RESET_WINDOW_MS
};
