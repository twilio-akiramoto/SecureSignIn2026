# Enhanced SignIn 2026 - Twilio Functions Migration & Stytch Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Express app to Twilio Functions, add Verify rate limiting, remove country dropdown, add Google Login demo, and integrate Stytch device fingerprinting

**Architecture:** Convert Express.js application to Twilio Serverless Functions with Twilio Assets for static files. Add server-side Verify rate limiting with in-memory tracking (3 calls per sender). Integrate Stytch SDK for device fingerprinting and bot detection. Store results in Function context/cookies for display on new results page.

**Tech Stack:** Twilio Functions (Serverless), Twilio Assets, Twilio Runtime, Stytch SDK, vanilla JavaScript

---

## Scope Check

This plan covers 6 major changes across multiple subsystems:
1. **GitHub Repository** - Administrative setup
2. **Rate Limiting** - Fraud prevention logic
3. **Architecture Migration** - Express to Twilio Functions (MAJOR)
4. **UI Changes** - Remove country dropdown
5. **UI Enhancement** - Google Login demo button
6. **Stytch Integration** - Device fingerprinting & bot detection

**Note:** The Twilio Functions migration (#3) is a prerequisite for all other changes. Everything will be rebuilt in the new architecture, making this one cohesive migration rather than separate plans.

## File Structure

### New Directory Structure (Twilio Functions)
```
functions/
├── index.js                          # Serves signup form (replaces GET /)
├── phone-verification.js             # Handles verification flow (replaces POST /phone_verification)
├── preferences.js                    # Serves preferences page
├── lookup-results.js                 # Serves lookup results
├── stytch-results.js                 # NEW: Serves Stytch analysis results
├── lookup.js                         # Lookup v1 validation endpoint
├── email-validation.js               # Email validation endpoint
├── verify.js                         # Verify initiation endpoint
├── verify-check.js                   # Verify code check endpoint
├── send-email.js                     # Email template endpoint
├── send-sms.js                       # SMS message endpoint
├── send-call.js                      # Voice call endpoint
└── helpers/
    ├── twilio-client.js              # Twilio API wrapper
    ├── sendgrid-client.js            # SendGrid API wrapper
    ├── stytch-client.js              # NEW: Stytch SDK integration
    ├── business-logic.js             # Data transformation (from business/business.js)
    └── rate-limiter.js               # NEW: Verify rate limiting logic

assets/
├── index.html                        # Signup form (from views/pages/index.ejs)
├── phone-verification.html           # Verification page (from views/pages/phone_verification.ejs)
├── preferences.html                  # Preferences page (from views/pages/preferences.ejs)
├── lookup-results.html               # Lookup results page (from views/pages/lookup_results.ejs)
├── stytch-results.html               # NEW: Stytch results page
├── js/
│   ├── address-autocomplete.js       # Address autocomplete (existing)
│   ├── form-validation.js            # Form validation (existing)
│   └── stytch-init.js                # NEW: Stytch client initialization
└── css/
    └── address-autocomplete.css      # Address autocomplete styles (existing)

.env                                   # Environment variables (add Stytch keys)
package.json                          # Add Stytch SDK dependency
```

### Files to Remove (Old Express Structure)
- `index.js` (Express server)
- `routes/routes.js`
- `services/twilio.js`
- `services/sendgrid.js`
- `business/business.js`
- `views/**/*.ejs` (all EJS templates)

---

## Task 1: Create GitHub Repository

**Files:**
- Manual steps (no code changes)

- [ ] **Step 1: Create new GitHub repository**

Navigate to: https://github.com/new

Repository settings:
- Owner: `twilio-akiramoto`
- Repository name: `EnhancedSignIn2026`
- Description: "Secure account signups with Twilio Lookup v2, Verify rate limiting, and Stytch device fingerprinting"
- Visibility: Public (or Private based on preference)
- Initialize: Do NOT initialize with README/gitignore/license

Click "Create repository"

- [ ] **Step 2: Add new remote to existing repository**

Run:
```bash
cd /Users/akiramoto/Documents/Github/EnhancedSignIn2026
git remote add origin-new https://github.com/twilio-akiramoto/EnhancedSignIn2026.git
```

Expected: No output (success)

- [ ] **Step 3: Push existing code to new repository**

Run:
```bash
git push origin-new feature/twilio-lookup-v2-modernization:main
```

Expected: Output showing objects being pushed and branch created

- [ ] **Step 4: Verify repository contents**

Open browser to: https://github.com/twilio-akiramoto/EnhancedSignIn2026

Expected: Repository shows all existing code files on `main` branch

- [ ] **Step 5: Update remote configuration (optional)**

If you want to replace the old remote:
```bash
git remote remove origin
git remote rename origin-new origin
```

Expected: `origin` now points to new repository

---

## Task 2: Rate Limiter Helper

**Files:**
- Create: `functions/helpers/rate-limiter.js`

- [ ] **Step 1: Create helpers directory**

Run:
```bash
mkdir -p /Users/akiramoto/Documents/Github/EnhancedSignIn2026/functions/helpers
```

Expected: Directory created

- [ ] **Step 2: Write rate limiter module**

Create `functions/helpers/rate-limiter.js`:

```javascript
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
```

- [ ] **Step 3: Verify file was created**

Run:
```bash
ls -la /Users/akiramoto/Documents/Github/EnhancedSignIn2026/functions/helpers/
```

Expected: Shows `rate-limiter.js`

- [ ] **Step 4: Commit rate limiter**

```bash
git add functions/helpers/rate-limiter.js
git commit -m "feat: add Verify API rate limiter (3 calls per hour per sender)

- In-memory storage for verify attempt tracking
- 1 hour reset window
- Returns allowed status and remaining attempts
- Prevents verify fraud by limiting to 3 calls per sender

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 3: Twilio Client Helper

**Files:**
- Create: `functions/helpers/twilio-client.js`

- [ ] **Step 1: Write Twilio client helper**

Create `functions/helpers/twilio-client.js`:

```javascript
/**
 * Twilio API Client Helper
 * Provides methods for Lookup v1, Lookup v2, Verify, and Messaging
 */

const rateLimiter = require('./rate-limiter');

/**
 * Initialize Twilio client from Runtime context
 * @param {Object} context - Twilio Runtime context
 * @returns {Object} - Twilio client instance
 */
function getTwilioClient(context) {
  return context.getTwilioClient();
}

/**
 * Lookup v1 API - Phone number validation with carrier info
 * @param {Object} context - Twilio Runtime context
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Promise<Object>}
 */
async function lookupV1(context, phoneNumber) {
  const client = getTwilioClient(context);

  try {
    const result = await client.lookups.v1
      .phoneNumbers(phoneNumber)
      .fetch({ type: ['carrier'] });
    return result;
  } catch (error) {
    console.error('Lookup v1 error:', error);
    throw error;
  }
}

/**
 * Lookup v2 API - Advanced validation with Identity Match
 * @param {Object} context - Twilio Runtime context
 * @param {string} phoneNumber - E.164 formatted phone number
 * @param {Object} userData - User data for Identity Match
 * @returns {Promise<Object>}
 */
async function lookupV2(context, phoneNumber, userData) {
  const client = getTwilioClient(context);

  // Convert date from YYYY-MM-DD to YYYYMMDD format
  const dateOfBirth = userData.date_of_birth
    ? userData.date_of_birth.replace(/-/g, '')
    : undefined;

  try {
    const result = await client.lookups.v2
      .phoneNumbers(phoneNumber)
      .fetch({
        fields: 'line_type_intelligence,identity_match,sim_swap,reassigned_number',
        firstName: userData.first_name,
        lastName: userData.last_name,
        addressLine1: userData.address,
        city: userData.city,
        state: userData.state,
        postalCode: userData.postal_code,
        countryCode: 'US', // Hardcoded to US (country dropdown removed)
        dateOfBirth: dateOfBirth,
        simSwapPeriod: context.SIM_SWAP_PERIOD || '30',
        reassignedNumberPeriod: context.REASSIGNED_NUMBER_PERIOD || '30'
      });
    return result;
  } catch (error) {
    console.error('Lookup v2 error:', error);
    throw error;
  }
}

/**
 * Verify API - Send verification code via SMS
 * @param {Object} context - Twilio Runtime context
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Promise<Object>} - { success: boolean, verification: Object|null, error: string|null }
 */
async function sendVerificationCode(context, phoneNumber) {
  // Check rate limit
  const rateLimitCheck = rateLimiter.canVerify(phoneNumber);

  if (!rateLimitCheck.allowed) {
    const resetTime = rateLimitCheck.resetAt.toLocaleString();
    return {
      success: false,
      verification: null,
      error: `Rate limit exceeded. Maximum ${rateLimiter.MAX_ATTEMPTS} verification attempts allowed. Try again after ${resetTime}`,
      rateLimitInfo: {
        remaining: 0,
        resetAt: rateLimitCheck.resetAt
      }
    };
  }

  const client = getTwilioClient(context);

  try {
    const verification = await client.verify.v2
      .services(context.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({
        to: phoneNumber,
        channel: 'sms'
      });

    // Record successful attempt
    rateLimiter.recordAttempt(phoneNumber);

    return {
      success: true,
      verification: verification,
      error: null,
      rateLimitInfo: {
        remaining: rateLimitCheck.remaining,
        resetAt: null
      }
    };
  } catch (error) {
    console.error('Verify send error:', error);
    throw error;
  }
}

/**
 * Verify API - Check verification code
 * @param {Object} context - Twilio Runtime context
 * @param {string} phoneNumber - E.164 formatted phone number
 * @param {string} code - Verification code
 * @returns {Promise<Object>}
 */
async function checkVerificationCode(context, phoneNumber, code) {
  const client = getTwilioClient(context);

  try {
    const verificationCheck = await client.verify.v2
      .services(context.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: phoneNumber, code: code });
    return verificationCheck;
  } catch (error) {
    console.error('Verify check error:', error);
    throw error;
  }
}

/**
 * Messaging API - Send SMS
 * @param {Object} context - Twilio Runtime context
 * @param {string} to - Recipient phone number
 * @param {string} message - Message body
 * @returns {Promise<string>} - Message SID
 */
async function sendSMS(context, to, message) {
  const client = getTwilioClient(context);

  try {
    const messageResponse = await client.messages.create({
      body: message,
      from: context.TWILIO_PHONE_NUMBER,
      to: to
    });
    return messageResponse.sid;
  } catch (error) {
    console.error('SMS send error:', error);
    throw error;
  }
}

/**
 * Voice API - Make outbound call
 * @param {Object} context - Twilio Runtime context
 * @param {string} to - Recipient phone number
 * @param {string} url - TwiML URL
 * @returns {Promise<string>} - Call SID
 */
async function makeCall(context, to, url) {
  const client = getTwilioClient(context);

  try {
    const call = await client.calls.create({
      url: url,
      from: context.TWILIO_PHONE_NUMBER,
      to: to
    });
    return call.sid;
  } catch (error) {
    console.error('Call error:', error);
    throw error;
  }
}

module.exports = {
  lookupV1,
  lookupV2,
  sendVerificationCode,
  checkVerificationCode,
  sendSMS,
  makeCall
};
```

- [ ] **Step 2: Verify file was created**

Run:
```bash
cat /Users/akiramoto/Documents/Github/EnhancedSignIn2026/functions/helpers/twilio-client.js | head -20
```

Expected: Shows first 20 lines of file

- [ ] **Step 3: Commit Twilio helper**

```bash
git add functions/helpers/twilio-client.js
git commit -m "feat: add Twilio client helper for Serverless Functions

- Lookup v1 and v2 support
- Verify with rate limiting integration
- Messaging and Voice API support
- Context-based client initialization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 4: SendGrid Client Helper

**Files:**
- Create: `functions/helpers/sendgrid-client.js`

- [ ] **Step 1: Write SendGrid client helper**

Create `functions/helpers/sendgrid-client.js`:

```javascript
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
```

- [ ] **Step 2: Commit SendGrid helper**

```bash
git add functions/helpers/sendgrid-client.js
git commit -m "feat: add SendGrid client helper for email validation and sending

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 5: Business Logic Helper

**Files:**
- Create: `functions/helpers/business-logic.js`

- [ ] **Step 1: Copy business logic from existing file**

Create `functions/helpers/business-logic.js` with transformed logic:

```javascript
/**
 * Business Logic Helper
 * Data transformation and validation logic
 */

/**
 * Transform Lookup v1 response for validation
 * @param {Object} lookupResponse - Twilio Lookup v1 response
 * @returns {Object} - { valid: boolean, message: string, data: Object }
 */
function transformLookupData(lookupResponse) {
  console.log(lookupResponse);

  if (lookupResponse.carrier.type === 'mobile') {
    let message = `Thanks for providing your ${lookupResponse.carrier.name} phone number!`;
    return { valid: true, message: message, data: lookupResponse };
  } else {
    // Normalize carrier names
    switch (lookupResponse.carrier.name) {
      case 'Google (Grand Central) BWI - Bandwidth.com - SVR':
        lookupResponse.carrier.name = 'Google Voice';
        break;
      case 'AT&T - PSTN':
        lookupResponse.carrier.name = 'AT&T';
        break;
      case 'T-Mobile USA, Inc.':
        lookupResponse.carrier.name = 'T-Mobile';
        break;
    }

    if (lookupResponse.carrier.type === 'voip') {
      lookupResponse.carrier.type = 'VoIP';
    }

    let message = `You provided a ${lookupResponse.carrier.type} number from ${lookupResponse.carrier.name}! Please enter your cell number.`;
    return { valid: false, message: message, data: lookupResponse };
  }
}

/**
 * Transform SendGrid email validation response
 * @param {Object} validationResponse - SendGrid validation response
 * @returns {Object} - { valid: boolean, message: string, data: Object }
 */
function transformEmailValidationData(validationResponse) {
  console.log(validationResponse);
  let data = validationResponse.data.result;

  if (data.verdict === 'Valid') {
    let message = `Thanks! Your email had a validity rating of ${data.score * 100}`;
    return { valid: true, message: message, data: data };
  } else {
    let message = 'There was an error validating your email address.';

    // Likely typo in domain name
    if (data.suggestion != null) {
      message = `Oops! Looks like you have a typo! Did you mean ${data.local}@${data.suggestion}?`;
      return { valid: false, message: message, data: data };
    }

    // Invalid email syntax
    if (!data.checks.domain.has_valid_address_syntax) {
      message = "The syntax of this email address doesn't look quite right...";
    }

    // Invalid domain (will bounce)
    if (!data.checks.domain.has_mx_or_a_record) {
      message = 'That appears to be an invalid domain';
    }

    // Disposable domain
    if (data.checks.domain.is_suspected_disposable_address) {
      message = `We don't allow sign-ups from ${data.host} because they are typically disposable.`;
    }

    // Distribution list
    if (data.checks.local_part.is_suspected_role_address) {
      message = `Although this appears to be valid, email addresses from ${data.local} are typically distribution groups. We don't allow that here.`;
    }

    // Has bounced from SendGrid
    if (data.checks.additional.has_known_bounces) {
      message = `Our email provider has tried delivering to this address before and it resulted in an error.`;
    }

    // Might bounce
    if (data.checks.additional.has_suspected_bounces) {
      message = `Our email provider thinks sending email to this address may result in a failure because sending emails to other users on this domain has resulted in a bounce.`;
    }

    if (data.verdict === 'Risky' && data.score > 0.5) {
      // We're making the conscious decision here to not reject emails with a risk score > 50%
      return { valid: true, message: message, data: data };
    } else {
      // Anything with a score < 50% or an invalid verdict, fail
      return { valid: false, message: message, data: data };
    }
  }
}

/**
 * Transform Verify check response
 * @param {Object} verificationCheckResponse - Twilio Verify check response
 * @returns {Object} - { valid: boolean, message: string, data: Object }
 */
function transformVerificationCheckData(verificationCheckResponse) {
  console.log(verificationCheckResponse);

  if (verificationCheckResponse.valid && verificationCheckResponse.status === 'approved') {
    return { valid: true, message: 'Success', data: verificationCheckResponse };
  }

  return { valid: false, message: 'Invalid Code', data: verificationCheckResponse };
}

/**
 * Convert Identity Match string to numeric score
 * @param {string} matchString - Match result string (exact_match, partial_match, no_match)
 * @returns {number|null} - Numeric score (0-100) or null
 */
function convertMatchScoreToNumber(matchString) {
  if (matchString === null || matchString === undefined) return null;

  switch (matchString) {
    case 'exact_match':
      return 100;
    case 'partial_match':
      return 50;
    case 'no_match':
      return 0;
    default:
      return null;
  }
}

/**
 * Transform Lookup v2 response with Identity Match
 * @param {Object} lookupResponse - Twilio Lookup v2 response
 * @returns {Object} - Structured lookup data
 */
function transformLookupV2Data(lookupResponse) {
  console.log('Lookup v2 Response:', lookupResponse);

  return {
    valid: lookupResponse.valid || false,
    phoneNumber: lookupResponse.phoneNumber || '',

    lineType: {
      carrierName: lookupResponse.lineTypeIntelligence?.carrier_name || 'Unknown',
      phoneType: lookupResponse.lineTypeIntelligence?.type || 'Unknown'
    },

    identityMatch: {
      firstName: convertMatchScoreToNumber(lookupResponse.identityMatch?.first_name_match),
      lastName: convertMatchScoreToNumber(lookupResponse.identityMatch?.last_name_match),
      address: convertMatchScoreToNumber(lookupResponse.identityMatch?.address_lines_match),
      city: convertMatchScoreToNumber(lookupResponse.identityMatch?.city_match),
      state: convertMatchScoreToNumber(lookupResponse.identityMatch?.state_match),
      postalCode: convertMatchScoreToNumber(lookupResponse.identityMatch?.postal_code_match),
      country: convertMatchScoreToNumber(lookupResponse.identityMatch?.address_country_match),
      dateOfBirth: convertMatchScoreToNumber(lookupResponse.identityMatch?.date_of_birth_match)
    },

    simSwap: {
      swappedInPeriod: lookupResponse.simSwap?.swapped_in_period || false,
      lastSwapDate: lookupResponse.simSwap?.last_sim_swap_date || null,
      period: lookupResponse.simSwap?.swapped_period || '30'
    },

    reassignedNumber: {
      reassignedInPeriod: lookupResponse.reassignedNumber?.reassigned_in_period || false,
      lastReassignedDate: lookupResponse.reassignedNumber?.last_reassigned_date || null,
      period: lookupResponse.reassignedNumber?.reassigned_period || '30'
    }
  };
}

module.exports = {
  transformLookupData,
  transformEmailValidationData,
  transformVerificationCheckData,
  convertMatchScoreToNumber,
  transformLookupV2Data
};
```

- [ ] **Step 2: Commit business logic helper**

```bash
git add functions/helpers/business-logic.js
git commit -m "feat: add business logic helper with data transformations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 6: Stytch Client Helper

**Files:**
- Create: `functions/helpers/stytch-client.js`

- [ ] **Step 1: Write Stytch client helper**

Create `functions/helpers/stytch-client.js`:

```javascript
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
```

- [ ] **Step 2: Commit Stytch helper**

```bash
git add functions/helpers/stytch-client.js
git commit -m "feat: add Stytch client helper for device fingerprinting and bot detection

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 7: Update Package Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read current package.json**

Run:
```bash
cat /Users/akiramoto/Documents/Github/EnhancedSignIn2026/package.json
```

Expected: Shows current dependencies

- [ ] **Step 2: Update package.json for Twilio Functions**

Replace entire `package.json`:

```json
{
  "name": "enhanced-signin-2026",
  "version": "1.0.0",
  "description": "Secure account signups with Twilio Lookup v2, Verify rate limiting, and Stytch device fingerprinting",
  "engines": {
    "node": "18.x"
  },
  "main": "functions/index.js",
  "scripts": {
    "start": "twilio-run",
    "deploy": "twilio serverless:deploy"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "@stytch/vanilla-js": "^1.0.0"
  },
  "devDependencies": {
    "twilio-run": "^3.5.0"
  },
  "keywords": [
    "twilio",
    "serverless",
    "twilio-functions",
    "stytch",
    "device-fingerprinting",
    "phone-verification"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/twilio-akiramoto/EnhancedSignIn2026.git"
  },
  "author": "twilio-akiramoto"
}
```

- [ ] **Step 3: Install dependencies**

Run:
```bash
cd /Users/akiramoto/Documents/Github/EnhancedSignIn2026
npm install
```

Expected: Dependencies installed successfully

- [ ] **Step 4: Commit package.json changes**

```bash
git add package.json package-lock.json
git commit -m "chore: update dependencies for Twilio Functions and Stytch

- Remove Express dependencies
- Add Stytch vanilla JS SDK
- Add twilio-run for local development
- Update repository URL

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 8: Update Environment Variables

**Files:**
- Modify: `.env`

- [ ] **Step 1: Read current .env file**

Run:
```bash
cat /Users/akiramoto/Documents/Github/EnhancedSignIn2026/.env
```

Expected: Shows current environment variables

- [ ] **Step 2: Add Stytch environment variables**

Add these lines to `.env`:

```
# Stytch Configuration
STYTCH_PROJECT_ID=your_stytch_project_id_here
STYTCH_SECRET=your_stytch_secret_here
STYTCH_PUBLIC_TOKEN=your_stytch_public_token_here
```

**Note:** You'll need to:
1. Sign up at https://stytch.com/
2. Create a new project
3. Get credentials from Stytch Dashboard -> API Keys

- [ ] **Step 3: Update .env.example**

Create/update `.env.example`:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid_here
TWILIO_PHONE_NUMBER=your_phone_number_here

# SendGrid Configuration
SENDGRID_VALIDATION_API_KEY=your_validation_api_key_here
SENDGRID_EMAIL_API_KEY=your_email_api_key_here
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=your_template_id_here
SENDGRID_FRAUD_ALERT_TEMPLATE_ID=your_template_id_here

# Lookup Configuration (days)
SIM_SWAP_PERIOD=30
REASSIGNED_NUMBER_PERIOD=30

# Stytch Configuration
STYTCH_PROJECT_ID=your_stytch_project_id_here
STYTCH_SECRET=your_stytch_secret_here
STYTCH_PUBLIC_TOKEN=your_stytch_public_token_here
```

- [ ] **Step 4: Commit .env.example**

```bash
git add .env.example
git commit -m "docs: add Stytch environment variables to .env.example

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

**Note:** DO NOT commit `.env` file (it should be in `.gitignore`)

---

## Task 9: Create Assets Directory Structure

**Files:**
- Create: `assets/` directory and subdirectories

- [ ] **Step 1: Create assets directory structure**

Run:
```bash
mkdir -p /Users/akiramoto/Documents/Github/EnhancedSignIn2026/assets/js
mkdir -p /Users/akiramoto/Documents/Github/EnhancedSignIn2026/assets/css
```

Expected: Directories created

- [ ] **Step 2: Copy existing static assets**

Run:
```bash
cp /Users/akiramoto/Documents/Github/EnhancedSignIn2026/public/js/address-autocomplete.js /Users/akiramoto/Documents/Github/EnhancedSignIn2026/assets/js/
cp /Users/akiramoto/Documents/Github/EnhancedSignIn2026/public/css/address-autocomplete.css /Users/akiramoto/Documents/Github/EnhancedSignIn2026/assets/css/
```

Expected: Files copied successfully

- [ ] **Step 3: Verify assets were copied**

Run:
```bash
ls -la /Users/akiramoto/Documents/Github/EnhancedSignIn2026/assets/js/
ls -la /Users/akiramoto/Documents/Github/EnhancedSignIn2026/assets/css/
```

Expected: Shows copied files

- [ ] **Step 4: Commit copied assets**

```bash
git add assets/
git commit -m "chore: copy static assets to assets/ directory for Twilio Assets

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 10: Create Stytch Client Initialization Script

**Files:**
- Create: `assets/js/stytch-init.js`

- [ ] **Step 1: Write Stytch initialization script**

Create `assets/js/stytch-init.js`:

```javascript
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
 */
async function initStytch(publicToken) {
  try {
    // Load Stytch from CDN (add to HTML: <script src="https://unpkg.com/@stytch/vanilla-js"></script>)
    if (typeof window.stytch === 'undefined') {
      console.error('Stytch SDK not loaded. Include script tag in HTML.');
      return;
    }

    stytchClient = window.stytch.createClient({
      publicToken: publicToken
    });

    console.log('Stytch client initialized');

    // Generate device fingerprint
    await generateFingerprint();
  } catch (error) {
    console.error('Stytch initialization error:', error);
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
    fingerprintId = result.device_fingerprint_id;

    console.log('Device fingerprint generated:', fingerprintId);

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
```

- [ ] **Step 2: Commit Stytch init script**

```bash
git add assets/js/stytch-init.js
git commit -m "feat: add Stytch client initialization script

- Device fingerprinting capture
- Session storage for fingerprint ID
- Device info utility functions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 11: Create Signup Form HTML Asset (Remove Country Dropdown)

**Files:**
- Create: `assets/index.html`

- [ ] **Step 1: Write signup form HTML**

Create `assets/index.html` (converted from EJS, country dropdown removed):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Account Signups</title>

  <!-- Bootstrap 3 -->
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery.bootstrapvalidator/0.5.3/css/bootstrapValidator.min.css">

  <!-- Custom CSS -->
  <link rel="stylesheet" href="address-autocomplete.css">

  <style>
    body {
      padding-top: 20px;
    }
    .card {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .card-body {
      padding: 30px;
    }
    .google-login-btn {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      width: 100%;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .google-login-btn:hover {
      background-color: #357ae8;
    }
    .google-icon {
      width: 20px;
      height: 20px;
      background-color: white;
      border-radius: 2px;
      padding: 2px;
    }
    .divider {
      text-align: center;
      margin: 20px 0;
      position: relative;
    }
    .divider::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 45%;
      height: 1px;
      background-color: #ddd;
    }
    .divider::after {
      content: '';
      position: absolute;
      right: 0;
      top: 50%;
      width: 45%;
      height: 1px;
      background-color: #ddd;
    }
  </style>
</head>

<body>
  <nav class="navbar navbar-default">
    <div class="container-fluid">
      <div class="navbar-header">
        <a class="navbar-brand" href="/">Secure Account Signups</a>
      </div>
    </div>
  </nav>

  <div class="container">
    <div class="card bg-light">
      <article class="card-body center-block" style="max-width: 400px;">
        <h4 class="card-title mt-3 text-center">Secure Account Signups</h4>
        <p class="text-center">
          <img alt="Brand" src="https://agent-logos.storage.googleapis.com/_/m0y6xq7eUCmIpHFSvvVA0ALc" height="32px" />
        </p>

        <!-- Google Login Button (Demo) -->
        <button type="button" class="google-login-btn" id="google-login-btn">
          <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Login with Google</span>
        </button>

        <div class="divider">
          <span style="background-color: #f7f7f7; padding: 0 10px; color: #999;">OR</span>
        </div>

        <!-- Signup Form -->
        <form class="sign-up-form" action="/phone-verification" method="post" id="signup-form">
          <div class="form-group">
            <input type="text" id="first_name" name="first_name" class="form-control" placeholder="First name" required />
          </div>

          <div class="form-group">
            <input type="text" id="last_name" name="last_name" class="form-control" placeholder="Last name" required />
          </div>

          <div class="form-group" style="position: relative;">
            <input type="text" id="address" name="address" class="form-control" placeholder="Street address" required autocomplete="off" />
            <div id="address-suggestions"></div>
          </div>

          <div class="form-group">
            <input type="text" id="city" name="city" class="form-control" placeholder="City" required />
          </div>

          <div class="form-group">
            <input type="text" id="state" name="state" class="form-control" placeholder="State" required />
          </div>

          <div class="form-group">
            <input type="text" id="postal_code" name="postal_code" class="form-control" placeholder="Postal code" required />
          </div>

          <!-- Country dropdown REMOVED per requirements -->

          <div class="form-group">
            <input type="date" id="date_of_birth" name="date_of_birth" class="form-control" placeholder="Date of Birth" required />
          </div>

          <div class="form-group">
            <input type="email" id="email_address" name="email_address" class="form-control" placeholder="Email address" required />
          </div>

          <div class="form-group">
            <input type="text" id="mobile_phone_number" name="mobile_phone_number" class="form-control" placeholder="Mobile phone number" required />
          </div>

          <div class="form-group">
            <div id="input_errors"></div>
          </div>

          <div class="form-group">
            <button type="submit" class="btn btn-primary btn-block">Continue</button>
          </div>
        </form>
      </article>
    </div>
  </div>

  <!-- jQuery and Bootstrap -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.bootstrapvalidator/0.5.3/js/bootstrapValidator.min.js"></script>

  <!-- International Telephone Input -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/16.0.2/js/intlTelInput.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/16.0.2/css/intlTelInput.min.css">

  <!-- Stytch SDK -->
  <script src="https://unpkg.com/@stytch/vanilla-js"></script>

  <!-- Custom Scripts -->
  <script src="address-autocomplete.js"></script>
  <script src="stytch-init.js"></script>

  <script>
    $(document).ready(function() {
      // Initialize Stytch
      const stytchPublicToken = 'STYTCH_PUBLIC_TOKEN'; // Will be replaced by Function
      if (window.StytchInit) {
        window.StytchInit.init(stytchPublicToken);
      }

      // Clear localStorage
      localStorage.removeItem('19q3.first_name');
      localStorage.removeItem('19q3.last_name');
      localStorage.removeItem('19q3.address');
      localStorage.removeItem('19q3.city');
      localStorage.removeItem('19q3.state');
      localStorage.removeItem('19q3.postal_code');
      localStorage.removeItem('19q3.country');
      localStorage.removeItem('19q3.date_of_birth');
      localStorage.removeItem('19q3.email_address');
      localStorage.removeItem('19q3.mobile_phone_number');

      // Initialize international telephone input
      var input = document.querySelector('#mobile_phone_number');
      window.iti = window.intlTelInput(input, {
        nationalMode: true,
        utilsScript: '//cdnjs.cloudflare.com/ajax/libs/intl-tel-input/16.0.2/js/utils.js',
        preferredCountries: ['us', 'ca', 'mx']
      });

      // Initialize address autocomplete
      if (typeof initAddressAutocomplete === 'function') {
        initAddressAutocomplete();
      }

      // Google Login Demo Button
      $('#google-login-btn').click(function() {
        alert('Google Login Demo\n\nThis is a demonstration feature that will be implemented in a future release.\n\nFor now, please use the signup form below to create your account.');
      });

      // Bootstrap Validator
      $('.sign-up-form').bootstrapValidator({
        message: 'This value is not valid',
        live: 'enabled',
        feedbackIcons: {
          valid: 'glyphicon glyphicon-ok',
          invalid: 'glyphicon glyphicon-remove',
          validating: 'glyphicon glyphicon-refresh'
        },
        fields: {
          first_name: {
            message: 'This does not seem like a valid first name',
            validators: {
              notEmpty: {
                message: 'First name is required and cannot be empty'
              },
              stringLength: {
                min: 2,
                max: 50,
                message: 'First name must be between 2 and 50 characters'
              },
              regexp: {
                regexp: /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/,
                message: 'First name contains invalid characters'
              }
            }
          },
          last_name: {
            message: 'This does not seem like a valid last name',
            validators: {
              notEmpty: {
                message: 'Last name is required and cannot be empty'
              },
              stringLength: {
                min: 2,
                max: 50,
                message: 'Last name must be between 2 and 50 characters'
              },
              regexp: {
                regexp: /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/,
                message: 'Last name contains invalid characters'
              }
            }
          },
          address: {
            validators: {
              notEmpty: {
                message: 'Street address is required'
              },
              stringLength: {
                min: 5,
                max: 200,
                message: 'Address must be between 5 and 200 characters'
              }
            }
          },
          city: {
            validators: {
              notEmpty: {
                message: 'City is required'
              },
              stringLength: {
                min: 2,
                max: 100,
                message: 'City must be between 2 and 100 characters'
              }
            }
          },
          state: {
            validators: {
              notEmpty: {
                message: 'State is required'
              },
              stringLength: {
                min: 2,
                max: 50,
                message: 'State must be at least 2 characters'
              }
            }
          },
          postal_code: {
            validators: {
              notEmpty: {
                message: 'Postal code is required'
              },
              stringLength: {
                min: 3,
                max: 10,
                message: 'Postal code must be between 3 and 10 characters'
              }
            }
          },
          date_of_birth: {
            validators: {
              notEmpty: {
                message: 'Date of birth is required'
              },
              date: {
                format: 'YYYY-MM-DD',
                message: 'Date of birth must be a valid date'
              },
              callback: {
                message: 'You must be at least 18 years old',
                callback: function(value, validator, $field) {
                  if (!value) return false;
                  const dob = new Date(value);
                  const today = new Date();
                  const age = today.getFullYear() - dob.getFullYear();
                  const monthDiff = today.getMonth() - dob.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    return age - 1 >= 18;
                  }
                  return age >= 18;
                }
              }
            }
          },
          email_address: {
            trigger: 'blur',
            validators: {
              remote: {
                url: '/email-validation'
              }
            }
          },
          mobile_phone_number: {
            trigger: 'blur',
            validators: {
              remote: {
                url: '/lookup',
                data: function() {
                  return {
                    mobile_number: window.iti.getNumber(intlTelInputUtils.numberFormat.E164)
                  };
                }
              }
            }
          }
        }
      });

      // Form submission - add Stytch fingerprint
      $('#signup-form').submit(function(e) {
        e.preventDefault();

        let formData = {
          first_name: $('#first_name').val(),
          last_name: $('#last_name').val(),
          address: $('#address').val(),
          city: $('#city').val(),
          state: $('#state').val(),
          postal_code: $('#postal_code').val(),
          date_of_birth: $('#date_of_birth').val(),
          email_address: $('#email_address').val(),
          mobile_phone_number: window.iti.getNumber(intlTelInputUtils.numberFormat.E164),
          stytch_fingerprint_id: window.StytchInit ? window.StytchInit.getFingerprintId() : null
        };

        // Store in localStorage
        Object.keys(formData).forEach(key => {
          localStorage.setItem('19q3.' + key, formData[key]);
        });

        // Update hidden field for phone number
        $('#mobile_phone_number').val(formData.mobile_phone_number);

        // Submit form
        this.submit();
      });
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit signup form HTML**

```bash
git add assets/index.html
git commit -m "feat: create signup form HTML asset with Google Login demo and Stytch init

- Removed country dropdown per requirements
- Added Google Login demo button with alert popup
- Integrated Stytch fingerprinting
- Converted from EJS to static HTML

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

---

## Task 12: Create Remaining HTML Assets

**Files:**
- Create: `assets/phone-verification.html`
- Create: `assets/preferences.html`
- Create: `assets/lookup-results.html`

This task is getting very long. Due to space constraints, I'll provide the structure but note that each HTML file needs to be created following the same pattern as index.html (converting EJS to static HTML).

**Summary of remaining HTML files needed:**
1. `assets/phone-verification.html` - Verification code entry page
2. `assets/preferences.html` - Communication preferences (ADD "View Stytch Results" button)
3. `assets/lookup-results.html` - Twilio Lookup results (REMOVE country field)
4. `assets/stytch-results.html` - NEW: Stytch analysis results page

**Key changes for each:**
- Remove EJS syntax (`<%= %>`, `<% %>`)
- Use client-side JavaScript to populate dynamic data from sessionStorage
- Update form actions to use Function endpoints
- Add Stytch fingerprint display where needed

Due to the plan length, I'll note that detailed step-by-step creation of these files should follow the same pattern as Task 11.

---

## Self-Review Checklist

**1. Spec Coverage:**
- ✅ GitHub Repository Creation (Task 1)
- ✅ Verify Rate Limiting (Task 2 - rate-limiter.js)
- ✅ Twilio Functions Architecture (Tasks 3-12 - helpers and HTML assets)
- ✅ Remove Country Dropdown (Task 11 - index.html, needs lookup-results.html)
- ✅ Google Login Demo Button (Task 11 - index.html)
- ⚠️  Stytch Integration - Partially covered (helpers created, need Function endpoints and results page)

**2. Placeholder Scan:**
- Need to complete HTML asset creation (tasks were summarized due to length)
- Need to create all Function endpoint files (index.js, phone-verification.js, etc.)
- Need to create stytch-results.html

**3. Type Consistency:**
- Function signatures consistent across helpers
- userData object structure maintained
- Context object pattern used throughout

**Remaining Work:**
The plan provides the foundation (helpers, package.json, directory structure, rate limiting) but needs additional tasks for:
- All Function endpoint files (index.js, phone-verification.js, etc.)
- Remaining HTML assets (phone-verification.html, preferences.html, lookup-results.html, stytch-results.html)
- Deployment configuration for Twilio Serverless

This plan is already quite extensive. Would you like me to:
1. Complete all remaining tasks in this plan (will be very long)?
2. Create a second plan for the Function endpoints and remaining assets?
3. Proceed with executing what we have so far?

---

## Execution Notes

**Important:** This migration is substantial. The plan has established:
- ✅ Rate limiting logic
- ✅ Helper modules (Twilio, SendGrid, Stytch, Business Logic)
- ✅ Package dependencies
- ✅ Environment variables
- ✅ Signup form with Google Login demo and no country dropdown
- ⚠️  Need to complete: Function endpoints, remaining HTML assets, deployment config

**Recommended Approach:**
1. Complete helper layer (done)
2. Create all HTML assets
3. Create all Function endpoints
4. Test locally with `twilio-run`
5. Deploy to Twilio Serverless

**Testing Strategy:**
- Local: `npm start` (runs twilio-run)
- Test each endpoint independently
- Verify rate limiting works
- Test Stytch integration
- Deploy to Twilio after local validation

**Deployment Configuration:**
- **Function Visibility:** All functions MUST be set to "Protected"
  - This requires a valid Twilio auth token to invoke
  - Prevents unauthorized access to endpoints
  - Configure via Twilio Console → Functions → Configure → Function Access
  - Or set in `.twilio-functions` file:
    ```json
    {
      "functions": {
        "protected": true
      }
    }
    ```
- **Assets Visibility:** Public (HTML, JS, CSS files need to be accessible)
- **Environment Variables:** Ensure all secrets are configured in Twilio Console
