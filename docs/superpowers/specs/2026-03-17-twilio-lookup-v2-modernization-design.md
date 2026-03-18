# Twilio Lookup v2 Modernization Design

**Date:** 2026-03-17
**Status:** Approved
**Author:** Claude Sonnet 4.5

## Overview

Modernize the SecureSignIn2026 application to use Twilio's Lookup v2 API with advanced features including Line Type Intelligence, Identity Match, SIM Swap detection, and Reassigned Number detection. Expand the signup form to collect detailed user information for identity verification and add a new page to display comprehensive lookup results.

## Goals

1. Upgrade from Twilio Lookup v1 to v2 API
2. Implement Identity Match to verify user identity against phone number
3. Display Line Type Intelligence (carrier name, phone type)
4. Check for SIM Swap events in configurable time period
5. Check for Reassigned Number in configurable time period
6. Expand signup form to collect: First Name, Last Name, Address, City, State, Postal Code, Country, Date of Birth
7. Add address autocomplete using Nominatim (OpenStreetMap) API
8. Create new lookup results page displaying all verification data
9. Add session management to persist data between pages

## Non-Goals

- Database implementation (use session storage instead)
- Historical tracking of lookup results
- Real-time blocking based on Identity Match scores (log silently)
- Migration of existing users (new signup flow only)

## Architecture

### High-Level Data Flow

```
User fills signup form (10 fields)
         ↓
Client-side validation (bootstrapValidator)
         ↓
Submit to /phone_verification
         ↓
Server calls Twilio Lookup v2 + Identity Match
         ↓
Store form data + results in express-session
         ↓
Phone verification flow (existing)
         ↓
Preferences page (existing + new button)
         ↓
Click "View Lookup Results"
         ↓
/lookup-results page displays cached data
```

### Technology Stack Additions

- **express-session**: Server-side session management
- **Nominatim API**: Free address autocomplete (OpenStreetMap)
- **Twilio Lookup v2 API**: Phone number intelligence

### File Structure Changes

```
SecureSignIn2026/
├── index.js (add session middleware)
├── routes/routes.js (add /lookup-results route, update /phone_verification)
├── services/
│   └── twilio.js (add lookupV2 method)
├── business/
│   └── business.js (add transformLookupV2Data method)
├── views/
│   ├── pages/
│   │   ├── index.ejs (expand signup form)
│   │   ├── preferences.ejs (add View Lookup Results button)
│   │   └── lookup_results.ejs (NEW)
│   └── partials/
│       └── nav.ejs (already has Twilio logo, no changes)
├── public/
│   └── js/
│       └── address-autocomplete.js (NEW - Nominatim integration)
└── .env (add SESSION_SECRET, SIM_SWAP_PERIOD, REASSIGNED_NUMBER_PERIOD)
```

## Detailed Design

### 1. Session Management

**Implementation in `index.js`:**

```javascript
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true in production with HTTPS
    maxAge: 3600000 // 1 hour
  }
}));
```

**Session Data Structure:**

```javascript
req.session.userData = {
  first_name: string,
  last_name: string,
  address: string,
  city: string,
  state: string,
  postal_code: string,
  country: string, // ISO code (US, CA, MX)
  date_of_birth: string, // YYYY-MM-DD format
  email_address: string,
  mobile_phone_number: string, // E.164 format
  lookup_results: {
    // Full Twilio Lookup v2 API response
    lineTypeIntelligence: {...},
    identityMatch: {...},
    simSwap: {...},
    reassignedNumber: {...}
  }
}
```

**Environment Variables (.env):**

```
SESSION_SECRET=random-secure-secret-key-here
SIM_SWAP_PERIOD=30
REASSIGNED_NUMBER_PERIOD=30
```

**Session Lifecycle:**
- Created: On signup form submission
- Used: Phone verification, preferences, lookup results pages
- Expires: After 1 hour of inactivity
- Cleanup: Automatic via express-session

### 2. Expanded Signup Form

**Form Fields (10 total):**

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| First Name | text | Required, 2-50 chars, letters/spaces/hyphens | - |
| Last Name | text | Required, 2-50 chars, letters/spaces/hyphens | - |
| Address | text | Required, with Nominatim autocomplete | Auto-populates City/State/PostalCode |
| City | text | Required, 2-100 chars | Auto-populated or manual |
| State | text | Required, 2+ chars | Auto-populated or manual |
| Postal Code | text | Required, 5-10 chars | Auto-populated or manual |
| Country | dropdown | Required, default: US | Options: US, CA, MX |
| Date of Birth | date | Required, age >= 18 | HTML5 date picker |
| Email Address | email | Required, SendGrid validation | Existing validation |
| Mobile Phone Number | tel | Required, Twilio Lookup v2 | Existing validation upgraded |

**Client-Side Validation:**
- Use existing bootstrapValidator framework
- Add age validation: DOB must be 18+ years ago
- Address autocomplete queries Nominatim after debounced typing (500ms)
- Phone number validation remains but now triggers Lookup v2

**Address Autocomplete (Nominatim/OpenStreetMap):**

Create `public/js/address-autocomplete.js`:

```javascript
// Debounced query to Nominatim API
// Query format: https://nominatim.openstreetmap.org/search?q={address}&format=json&addressdetails=1&countrycodes=us,ca,mx
// On selection: auto-populate Address, City, State, PostalCode
// Allow manual override if autocomplete doesn't work
```

**Implementation notes:**
- Nominatim is free, no API key required
- Rate limit: 1 request/second (respect fair use policy)
- Add debouncing to avoid excessive requests
- Fallback: Users can still manually enter all fields

### 3. Twilio Lookup v2 Integration

**New Method in `services/twilio.js`:**

```javascript
lookupV2: function(phone_number, userData) {
  return new Promise((resolve, reject) => {
    client.lookups.v2
      .phoneNumbers(phone_number)
      .fetch({
        fields: 'line_type_intelligence,identity_match,sim_swap,reassigned_number',
        // Identity Match parameters
        firstName: userData.first_name,
        lastName: userData.last_name,
        addressLine1: userData.address,
        city: userData.city,
        state: userData.state,
        postalCode: userData.postal_code,
        countryCode: userData.country, // ISO country code
        dateOfBirth: userData.date_of_birth, // YYYY-MM-DD format
        // SIM Swap and Reassigned Number parameters
        simSwapPeriod: process.env.SIM_SWAP_PERIOD || '30',
        reassignedNumberPeriod: process.env.REASSIGNED_NUMBER_PERIOD || '30'
      })
      .then(json => resolve(json))
      .catch(error => reject(error));
  });
}
```

**API Response Structure:**

Twilio Lookup v2 returns:

```javascript
{
  callingCountryCode: string,
  countryCode: string,
  phoneNumber: string, // E.164 format
  nationalFormat: string,
  valid: boolean,
  validationErrors: array,

  lineTypeIntelligence: {
    carrier_name: string,
    type: string, // "mobile", "landline", "voip"
    mobile_country_code: string,
    mobile_network_code: string,
    error_code: null
  },

  identityMatch: {
    first_name_match: number, // 0-100
    last_name_match: number, // 0-100
    address_match: number, // 0-100
    city_match: number, // 0-100
    state_match: number, // 0-100
    postal_code_match: number, // 0-100
    country_match: number, // 0-100
    date_of_birth_match: number, // 0-100
    error_code: null
  },

  simSwap: {
    last_sim_swap_date: string | null, // ISO 8601 format
    swapped_period: string, // "30"
    swapped_in_period: boolean,
    error_code: null
  },

  reassignedNumber: {
    last_reassigned_date: string | null, // ISO 8601 format
    reassigned_period: string, // "30"
    reassigned_in_period: boolean,
    error_code: null
  }
}
```

**Error Handling:**
- If Lookup v2 fails, log error but allow signup to continue
- Store partial data if some add-ons fail
- Display "Not Available" for missing data on results page

### 4. Business Logic Transformation

**New Method in `business/business.js`:**

```javascript
transformLookupV2Data: function(lookupResponse) {
  console.log(lookupResponse);

  return {
    valid: lookupResponse.valid,
    phoneNumber: lookupResponse.phoneNumber,

    lineType: {
      carrierName: lookupResponse.lineTypeIntelligence?.carrier_name || 'Unknown',
      phoneType: lookupResponse.lineTypeIntelligence?.type || 'Unknown'
    },

    identityMatch: {
      firstName: lookupResponse.identityMatch?.first_name_match || null,
      lastName: lookupResponse.identityMatch?.last_name_match || null,
      address: lookupResponse.identityMatch?.address_match || null,
      city: lookupResponse.identityMatch?.city_match || null,
      state: lookupResponse.identityMatch?.state_match || null,
      postalCode: lookupResponse.identityMatch?.postal_code_match || null,
      country: lookupResponse.identityMatch?.country_match || null,
      dateOfBirth: lookupResponse.identityMatch?.date_of_birth_match || null
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
```

**Purpose:**
- Transform Twilio's nested response into a flatter, display-friendly structure
- Handle null/undefined values gracefully
- Provide defaults for missing data

### 5. Updated Routing

**Modified Route: POST `/phone_verification`**

```javascript
app.post("/phone_verification", (req, res) => {
  const userData = {
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    postal_code: req.body.postal_code,
    country: req.body.country,
    date_of_birth: req.body.date_of_birth,
    email_address: req.body.email_address,
    mobile_phone_number: req.body.mobile_phone_number
  };

  // Call Twilio Lookup v2 with Identity Match
  twilio.lookupV2(userData.mobile_phone_number, userData)
    .then(lookupResponse => {
      // Transform and store in session
      userData.lookup_results = business.transformLookupV2Data(lookupResponse);
      req.session.userData = userData;

      // Send verification SMS (existing flow)
      return twilio.verify(userData.mobile_phone_number);
    })
    .then(() => {
      // Render phone verification page
      res.render("pages/phone_verification", {
        formData: userData
      });
    })
    .catch(error => {
      console.error('Lookup v2 error:', error);
      // Even if lookup fails, continue with verification
      req.session.userData = userData;
      twilio.verify(userData.mobile_phone_number);
      res.render("pages/phone_verification", {
        formData: userData
      });
    });
});
```

**New Route: GET `/lookup-results`**

```javascript
app.get("/lookup-results", (req, res) => {
  // Check if session data exists
  if (!req.session.userData || !req.session.userData.lookup_results) {
    return res.redirect("/");
  }

  res.render("pages/lookup_results", {
    userData: req.session.userData,
    lookupData: req.session.userData.lookup_results
  });
});
```

**Keep Existing Routes:**
- `/` - Signup form (modified template)
- GET `/preferences` - Communication preferences (add button)
- GET `/verify` - Verify API endpoint
- GET `/verifyCheck` - Verify check API endpoint
- GET `/lookup` - Keep v1 lookup for backward compatibility (may deprecate later)
- Email and SMS template routes

### 6. UI Implementation

#### Updated Preferences Page (`views/pages/preferences.ejs`)

Add after communication preferences section (around line 94):

```html
<div>
  <hr>
  <h4 class="text-center">Account Verification Details</h4>
  <p class="lead text-center">View the verification results from your signup</p>
  <div class="text-center">
    <a href="/lookup-results" class="btn btn-info btn-lg">View Lookup Results</a>
  </div>
</div>
```

#### New Lookup Results Page (`views/pages/lookup_results.ejs`)

**Structure:**

```html
<!DOCTYPE html>
<html>
  <head>
    <% include ../partials/header.ejs %>
    <style>
      .score-high { color: #28a745; font-weight: bold; }
      .score-medium { color: #ffc107; font-weight: bold; }
      .score-low { color: #dc3545; font-weight: bold; }
      .result-card { margin-bottom: 20px; }
    </style>
  </head>

  <body>
    <% include ../partials/nav.ejs %>

    <div class="container">
      <div class="card bg-light">
        <article class="card-body center-block" style="max-width: 800px;">
          <h4 class="card-title mt-3 text-center">Account Verification Results</h4>
          <p class="text-center">
            <img alt="Brand" src="https://agent-logos.storage.googleapis.com/_/m0y6xq7eUCmIpHFSvvVA0ALc" height="32px" />
          </p>

          <!-- Line Type Intelligence -->
          <div class="card result-card">
            <div class="card-header">
              <h5>Line Type Intelligence</h5>
            </div>
            <div class="card-body">
              <p><strong>Carrier Name:</strong> <%= lookupData.lineType.carrierName %></p>
              <p><strong>Phone Type:</strong> <%= lookupData.lineType.phoneType %></p>
            </div>
          </div>

          <!-- Identity Match Scores -->
          <div class="card result-card">
            <div class="card-header">
              <h5>Identity Match Scores</h5>
            </div>
            <div class="card-body">
              <table class="table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Match Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>First Name</td>
                    <td class="<%= getScoreClass(lookupData.identityMatch.firstName) %>">
                      <%= formatScore(lookupData.identityMatch.firstName) %>
                    </td>
                  </tr>
                  <tr>
                    <td>Last Name</td>
                    <td class="<%= getScoreClass(lookupData.identityMatch.lastName) %>">
                      <%= formatScore(lookupData.identityMatch.lastName) %>
                    </td>
                  </tr>
                  <tr>
                    <td>Address</td>
                    <td class="<%= getScoreClass(lookupData.identityMatch.address) %>">
                      <%= formatScore(lookupData.identityMatch.address) %>
                    </td>
                  </tr>
                  <tr>
                    <td>City</td>
                    <td class="<%= getScoreClass(lookupData.identityMatch.city) %>">
                      <%= formatScore(lookupData.identityMatch.city) %>
                    </td>
                  </tr>
                  <tr>
                    <td>State</td>
                    <td class="<%= getScoreClass(lookupData.identityMatch.state) %>">
                      <%= formatScore(lookupData.identityMatch.state) %>
                    </td>
                  </tr>
                  <tr>
                    <td>Postal Code</td>
                    <td class="<%= getScoreClass(lookupData.identityMatch.postalCode) %>">
                      <%= formatScore(lookupData.identityMatch.postalCode) %>
                    </td>
                  </tr>
                  <tr>
                    <td>Country</td>
                    <td class="<%= getScoreClass(lookupData.identityMatch.country) %>">
                      <%= formatScore(lookupData.identityMatch.country) %>
                    </td>
                  </tr>
                  <tr>
                    <td>Date of Birth</td>
                    <td class="<%= getScoreClass(lookupData.identityMatch.dateOfBirth) %>">
                      <%= formatScore(lookupData.identityMatch.dateOfBirth) %>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SIM Swap Check -->
          <div class="card result-card">
            <div class="card-header">
              <h5>SIM Swap Check (Last <%= lookupData.simSwap.period %> Days)</h5>
            </div>
            <div class="card-body">
              <p><strong>SIM Swapped in Period:</strong>
                <% if (lookupData.simSwap.swappedInPeriod) { %>
                  <span class="text-danger">Yes</span>
                <% } else { %>
                  <span class="text-success">No</span>
                <% } %>
              </p>
              <p><strong>Last SIM Swap Date:</strong>
                <%= formatDate(lookupData.simSwap.lastSwapDate) %>
              </p>
            </div>
          </div>

          <!-- Reassigned Number Check -->
          <div class="card result-card">
            <div class="card-header">
              <h5>Reassigned Number Check (Last <%= lookupData.reassignedNumber.period %> Days)</h5>
            </div>
            <div class="card-body">
              <p><strong>Number Reassigned in Period:</strong>
                <% if (lookupData.reassignedNumber.reassignedInPeriod) { %>
                  <span class="text-danger">Yes</span>
                <% } else { %>
                  <span class="text-success">No</span>
                <% } %>
              </p>
              <p><strong>Last Reassignment Date:</strong>
                <%= formatDate(lookupData.reassignedNumber.lastReassignedDate) %>
              </p>
            </div>
          </div>

          <div class="text-center">
            <a href="/preferences" class="btn btn-primary btn-lg">Back to Preferences</a>
          </div>
        </article>
      </div>
    </div>

    <%
      function getScoreClass(score) {
        if (score === null) return '';
        if (score >= 80) return 'score-high';
        if (score >= 50) return 'score-medium';
        return 'score-low';
      }

      function formatScore(score) {
        return score !== null ? score + '/100' : 'Not Available';
      }

      function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    %>
  </body>
</html>
```

**Visual Design:**
- Bootstrap cards for section separation
- Color-coded scores: Green (80-100), Yellow (50-79), Red (0-49)
- Table format for Identity Match scores
- Yes/No with color indicators for SIM Swap and Reassigned Number
- Human-readable date formatting
- "Not Available" for null values

### 7. Package Dependencies

**Update `package.json` dependencies:**

```json
{
  "dependencies": {
    "axios": "^0.21.1",
    "dotenv": "^9.0.2",
    "ejs": "^2.5.6",
    "express": "^4.17.1",
    "express-session": "^1.17.3",
    "intl-tel-input": "^16.0.2",
    "twilio": "^4.0.0"
  }
}
```

**Key changes:**
- Add `express-session` for session management
- Update `twilio` to v4.x (supports Lookup v2 API)

## Testing Strategy

### Manual Testing Checklist

1. **Signup Form:**
   - [ ] All 10 fields display correctly
   - [ ] Address autocomplete queries Nominatim
   - [ ] Selecting address auto-populates City, State, PostalCode
   - [ ] Date picker works and validates age >= 18
   - [ ] Country dropdown shows US, CA, MX with US default
   - [ ] Form validation prevents submission with invalid data
   - [ ] Successful submission triggers Lookup v2 call

2. **Twilio Lookup v2:**
   - [ ] API call includes all Identity Match parameters
   - [ ] Response includes Line Type Intelligence
   - [ ] Response includes Identity Match scores (0-100)
   - [ ] Response includes SIM Swap data
   - [ ] Response includes Reassigned Number data
   - [ ] Error handling works if API fails

3. **Session Management:**
   - [ ] Session created on form submission
   - [ ] Session persists across page navigation
   - [ ] Session expires after 1 hour
   - [ ] Invalid/expired session redirects to home

4. **Phone Verification:**
   - [ ] Existing verification flow still works
   - [ ] User data displays correctly on verification page

5. **Preferences Page:**
   - [ ] "View Lookup Results" button appears
   - [ ] Clicking button navigates to /lookup-results
   - [ ] Existing communication preferences still work

6. **Lookup Results Page:**
   - [ ] All sections display correctly
   - [ ] Line Type Intelligence shows carrier and phone type
   - [ ] Identity Match scores display with color coding
   - [ ] SIM Swap shows Yes/No and date
   - [ ] Reassigned Number shows Yes/No and date
   - [ ] "Not Available" displays for missing data
   - [ ] Dates format correctly (human-readable)
   - [ ] Back button returns to preferences

### Test Scenarios

**Scenario 1: Happy Path**
- User with valid US mobile number
- All identity information matches
- No SIM swap or reassignment
- Expected: All green scores, clean results

**Scenario 2: Identity Mismatch**
- User with valid number but wrong address
- Expected: Low address/city/state/postal scores, other fields high

**Scenario 3: Recent SIM Swap**
- User with number that had SIM swap in last 30 days
- Expected: SIM Swap shows "Yes" with date

**Scenario 4: VoIP Number**
- User provides Google Voice or other VoIP number
- Expected: Line Type shows "voip", identity match may be low

**Scenario 5: Session Expiry**
- Wait 1 hour after signup
- Try to access /lookup-results
- Expected: Redirect to home page

**Scenario 6: API Failure**
- Twilio API returns error
- Expected: Signup continues, lookup results show "Not Available"

## Security Considerations

1. **Session Security:**
   - Use strong SESSION_SECRET (min 32 random characters)
   - Set secure: true in production (requires HTTPS)
   - Implement CSRF protection for production
   - Consider using session store (Redis) for production

2. **Data Privacy:**
   - Personal data stored in session only (not database)
   - Sessions expire after 1 hour
   - No logging of PII to console in production
   - Consider GDPR compliance for EU users

3. **API Security:**
   - Keep TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env
   - Never commit .env to git
   - Rotate Twilio credentials periodically
   - Rate limit Nominatim requests (1/second)

4. **Input Validation:**
   - Server-side validation for all form fields
   - Sanitize inputs before API calls
   - Prevent XSS in EJS templates (use <%= instead of <%-)
   - Validate age >= 18 on server side

## Performance Considerations

1. **API Latency:**
   - Twilio Lookup v2 with all add-ons: ~1-3 seconds
   - Nominatim autocomplete: ~200-500ms per query
   - Total signup time: ~3-5 seconds
   - Consider loading indicator for user feedback

2. **Rate Limits:**
   - Nominatim: Max 1 request/second (implement debouncing)
   - Twilio: No hard limit, but charged per lookup
   - Consider caching Nominatim results client-side

3. **Session Storage:**
   - Memory-based sessions suitable for low traffic
   - For production: Use Redis or MongoDB session store
   - Monitor memory usage with many concurrent sessions

## Deployment Considerations

1. **Environment Variables:**
   - Ensure all .env variables set in production
   - Generate secure SESSION_SECRET
   - Configure SIM_SWAP_PERIOD and REASSIGNED_NUMBER_PERIOD

2. **HTTPS:**
   - Required for secure session cookies
   - Set session.cookie.secure = true in production

3. **Monitoring:**
   - Log Twilio API failures
   - Track session creation/expiry rates
   - Monitor Nominatim rate limit compliance

4. **Cost:**
   - Twilio Lookup v2 pricing per lookup
   - Identity Match, SIM Swap, Reassigned Number are add-ons (additional cost)
   - Nominatim is free (respect fair use)

## Future Enhancements

1. **Database Integration:**
   - Store user signups and lookup history
   - Enable analytics on identity match trends
   - Track SIM swap/reassignment patterns

2. **Real-Time Blocking:**
   - Block signups with low Identity Match scores
   - Flag accounts with recent SIM swaps
   - Alert on reassigned numbers

3. **Enhanced Address Validation:**
   - Upgrade to Google Places API for better accuracy
   - Validate address format by country
   - Implement address verification service

4. **User Dashboard:**
   - Allow users to update their information
   - Re-run verification checks
   - View historical verification results

5. **Admin Interface:**
   - View all signups and verification results
   - Configure thresholds for blocking
   - Export verification reports

## Success Metrics

1. **Functional:**
   - Signup form captures all 10 fields successfully
   - Twilio Lookup v2 calls succeed >99% of the time
   - Session management works without data loss
   - Lookup results page displays all data accurately

2. **User Experience:**
   - Signup time remains under 30 seconds
   - Address autocomplete improves data entry speed
   - Clear display of verification results
   - No broken user flows

3. **Data Quality:**
   - Identity Match scores provide meaningful signal
   - SIM Swap detection identifies suspicious activity
   - Reassigned Number detection prevents fraud
   - Line Type Intelligence accurately identifies phone types

## Open Questions

None - all clarifications addressed during design phase.

## Appendix

### Nominatim API Example

**Request:**
```
GET https://nominatim.openstreetmap.org/search?q=1600+Pennsylvania+Avenue+Washington+DC&format=json&addressdetails=1&limit=5&countrycodes=us
```

**Response:**
```json
[
  {
    "display_name": "1600, Pennsylvania Avenue Northwest, Washington, DC, 20500, USA",
    "address": {
      "house_number": "1600",
      "road": "Pennsylvania Avenue Northwest",
      "city": "Washington",
      "state": "District of Columbia",
      "postcode": "20500",
      "country": "United States",
      "country_code": "us"
    }
  }
]
```

### Twilio Lookup v2 API Reference

- Documentation: https://www.twilio.com/docs/lookup/v2-api
- Line Type Intelligence: https://www.twilio.com/docs/lookup/v2-api/line-type-intelligence
- Identity Match: https://www.twilio.com/docs/lookup/v2-api/identity-match
- SIM Swap: https://www.twilio.com/docs/lookup/v2-api/sim-swap
- Reassigned Number: https://www.twilio.com/docs/lookup/v2-api/reassigned-number

### Browser Compatibility

- HTML5 date picker: Supported in all modern browsers
- Nominatim API: Works in all browsers with fetch/XMLHttpRequest
- Express sessions: Server-side, no browser requirements
- Bootstrap 3: Compatible with IE10+, all modern browsers
