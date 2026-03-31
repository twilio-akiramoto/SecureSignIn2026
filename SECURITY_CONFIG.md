# Security Configuration Guide

This document outlines the required environment variables and security settings for your Twilio Functions deployment.

## Critical Security Fixes Implemented

✅ **CORS Protection**: Replaced wildcard (`*`) with domain-specific origins
✅ **Rate Limiting**: Added brute force protection on verification checks (5 attempts/15 min)
✅ **Input Validation**: All user inputs validated (phone, email, dates, names)
✅ **Error Sanitization**: Generic client errors, detailed server logs only
✅ **Template Security**: Whitelisted templates, no user-controlled values

---

## Required Environment Variables

### 1. CORS Configuration

**Variable**: `ALLOWED_ORIGINS` (Optional)

**Purpose**: Additional domains allowed to call your functions besides `.twil.io`

**Format**: Comma-separated list of full URLs

**Example**:
```
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

**Note**: By default, all functions allow same-origin requests (`.twil.io` domain). Only add this if you need to allow other specific domains.

---

### 2. TwiML URLs (Required for Voice Calls)

**Variables**:
- `TWIML_ORDER_CONFIRMATION_URL`
- `TWIML_FRAUD_ALERT_URL`

**Purpose**: TwiML endpoints for voice calls (previously hardcoded)

**Example**:
```
TWIML_ORDER_CONFIRMATION_URL=https://handler.twilio.com/twiml/EH<your_order_confirmation_twiml_id>
TWIML_FRAUD_ALERT_URL=https://handler.twilio.com/twiml/EH<your_fraud_alert_twiml_id>
```

**How to get these**:
1. Go to Twilio Console → TwiML Bins
2. Create new TwiML bins for each call type
3. Copy the TwiML bin URLs
4. Add to environment variables

---

### 3. Existing Environment Variables (Required)

These should already be configured:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid Configuration
SENDGRID_VALIDATION_API_KEY=your_validation_api_key
SENDGRID_EMAIL_API_KEY=your_email_api_key
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FRAUD_ALERT_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Lookup Configuration
SIM_SWAP_PERIOD=30
REASSIGNED_NUMBER_PERIOD=30

# Stytch Configuration (if using)
STYTCH_PROJECT_ID=project-live-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
STYTCH_SECRET=secret-live-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STYTCH_PUBLIC_TOKEN=public-token-live-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## How to Configure Environment Variables

### Option 1: Twilio Console (Recommended for Production)

1. Go to **Twilio Console** → **Functions & Assets** → **Services**
2. Select your service
3. Click **Environment Variables** tab
4. Add each variable with its value
5. Click **Deploy All** to apply changes

### Option 2: Local Development (.env file)

1. Create/update `.env` file in project root
2. Add all environment variables
3. Run `twilio serverless:deploy` to sync

---

## Function Visibility Settings

### Public Functions (No authentication required):
- `/lookup` - Phone validation for form
- `/email-validation` - Email validation for form

These need to be public so the client-side form validation can call them.

### Protected Functions (Require Twilio auth):
- `/verify` - Send verification code
- `/verify-check` - Check verification code
- `/lookup-v2` - Advanced lookup with Identity Match
- `/send-email` - Send email templates
- `/send-sms` - Send SMS messages
- `/send-call` - Make voice calls
- `/phone-verification` - Phone verification page
- `/preferences` - Preferences page
- `/lookup-results` - Results display
- `/stytch-results` - Stytch analysis results
- `/api/alerts/active` - Active alerts endpoint

**To configure**:
1. Twilio Console → Functions & Assets → Functions
2. Select each function
3. Set **Visibility** dropdown
4. Save changes
5. Deploy all

---

## Security Features Implemented

### 1. CORS Protection

**Before**:
```javascript
response.appendHeader('Access-Control-Allow-Origin', '*'); // ❌ Insecure
```

**After**:
```javascript
// ✅ Secure: Only allows same-origin or whitelisted domains
const origin = event.request?.headers?.origin;
if (origin && (origin.includes('.twil.io') || allowedOrigins.includes(origin))) {
  response.appendHeader('Access-Control-Allow-Origin', origin);
}
```

---

### 2. Rate Limiting

**Verification Code Sending** (`/verify`):
- Max 3 attempts per hour per phone number
- Prevents SMS/call spam fraud

**Verification Code Checking** (`/verify-check`):
- Max 5 attempts per 15 minutes per phone number
- Prevents brute force attacks on 6-digit codes

**Implementation**: In-memory storage with automatic cleanup
**Limitation**: Resets on cold starts (acceptable for most use cases)

---

### 3. Input Validation

**Phone Numbers**:
- E.164 format validation: `^\+[1-9]\d{1,14}$`
- Example: `+14155552671`

**Email Addresses**:
- Format validation: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Max length: 254 characters

**Verification Codes**:
- 6-digit format: `^\d{6}$`

**User Data**:
- Names: Letters, spaces, hyphens, apostrophes only
- Max 50 characters
- Postal codes: Digits and hyphens only, max 10 characters
- Dates: YYYY-MM-DD format validation

---

### 4. Error Message Sanitization

**Before**:
```javascript
message: error.message // ❌ Exposes internal details
```

**After**:
```javascript
// Server-side logging (detailed)
console.error('Verify endpoint error:', {
  code: error.code,
  status: error.status
});

// Client-side response (generic)
response.setBody({
  valid: false,
  message: 'Unable to send verification code. Please try again.' // ✅ Generic
});
```

---

### 5. HTTP Status Codes

Proper HTTP status codes for better API semantics:

- `200 OK` - Validation completed (valid or invalid result)
- `204 No Content` - CORS preflight success
- `400 Bad Request` - Invalid/missing required parameters
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Unexpected server error

---

## Testing Security

### 1. Test CORS Protection

```bash
# Should work (same origin)
curl -X POST https://your-functions-url.twil.io/lookup \
  -H "Origin: https://your-functions-url.twil.io" \
  -H "Content-Type: application/json" \
  -d '{"mobile_number": "+14155552671"}'

# Should be blocked (different origin without whitelist)
curl -X POST https://your-functions-url.twil.io/lookup \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"mobile_number": "+14155552671"}'
```

### 2. Test Rate Limiting

```bash
# Make 6 verification check attempts
for i in {1..6}; do
  curl -X POST https://your-functions-url.twil.io/verify-check \
    -d "mobile_number=+14155552671&verification_code=123456"
  echo "\nAttempt $i"
done

# Should see 429 status on 6th attempt
```

### 3. Test Input Validation

```bash
# Invalid phone format
curl -X POST https://your-functions-url.twil.io/lookup \
  -d '{"mobile_number": "1234567890"}' # Missing + prefix

# Invalid email
curl -X POST https://your-functions-url.twil.io/email-validation \
  -d '{"email_address": "notanemail"}' # No @ symbol
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured in Twilio Console
- [ ] TwiML URLs created and configured
- [ ] Function visibility set correctly (public vs protected)
- [ ] CORS tested from your domain
- [ ] Rate limiting tested
- [ ] Input validation tested
- [ ] Error messages verified (no sensitive data exposure)
- [ ] Test all endpoints with invalid inputs
- [ ] Monitor logs for security events

---

## Monitoring & Alerts

### What to Monitor

1. **Rate Limit Events**: Check logs for "Rate limit exceeded" messages
2. **Failed Validations**: High volumes of 400 errors may indicate attack
3. **CORS Violations**: Requests from unexpected origins
4. **Unusual Patterns**: Spikes in verification attempts

### Twilio Console Logs

View function execution logs:
1. Twilio Console → Functions & Assets → Services
2. Select your service
3. Click **Logs** tab
4. Filter by function name or error level

---

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Rotate credentials regularly** - Especially API keys
3. **Use separate credentials** - Dev vs Production environments
4. **Monitor usage** - Set up billing alerts in Twilio Console
5. **Review logs** - Check for suspicious activity weekly
6. **Keep dependencies updated** - Run `npm audit` regularly
7. **Test before deploy** - Always test in dev environment first

---

## Known Limitations

1. **Rate Limiting**: In-memory storage resets on cold starts
   - **Impact**: Rate limits may reset unpredictably
   - **Mitigation**: Acceptable for most use cases; consider Redis for production

2. **CORS**: Requires origin header in request
   - **Impact**: Some browsers may not send origin header
   - **Mitigation**: Fallback to referer header implemented

3. **Phone Validation**: E.164 format only
   - **Impact**: Users must enter international format
   - **Mitigation**: Use intl-tel-input library on frontend (already implemented)

---

## Need Help?

- **Twilio Docs**: https://www.twilio.com/docs/serverless/functions-assets
- **Security Issues**: Report to repository maintainer
- **Questions**: Open an issue on GitHub

---

**Last Updated**: 2026-03-30
**Security Version**: 1.0.0
