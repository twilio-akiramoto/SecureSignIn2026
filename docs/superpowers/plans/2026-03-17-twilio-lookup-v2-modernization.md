# Twilio Lookup v2 Modernization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the application to use Twilio Lookup v2 API with Identity Match, expand signup form to 10 fields with address autocomplete, and add comprehensive lookup results display page.

**Architecture:** Add express-session for session management, create Twilio Lookup v2 integration with Identity Match/SIM Swap/Reassigned Number checks, implement Nominatim address autocomplete, and build new lookup results page with color-coded identity scores.

**Tech Stack:** Node.js, Express, express-session, Twilio SDK v4, Nominatim API (OpenStreetMap), EJS templates, Bootstrap 3, bootstrapValidator

---

## Chunk 1: Dependencies and Configuration

### Task 1: Update Package Dependencies

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/package.json`

- [ ] **Step 1: Update dependencies in package.json**

Add `express-session` and update `twilio` to v4.x:

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

- [ ] **Step 2: Install updated dependencies**

Run: `npm install`

Expected output: Successfully installed express-session@1.17.3 and updated twilio to v4.x

- [ ] **Step 3: Commit dependency updates**

```bash
git add package.json package-lock.json
git commit -m "chore: add express-session and upgrade twilio to v4"
```

### Task 2: Add Environment Variables

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/.env`

- [ ] **Step 1: Add new environment variables to .env**

Add these lines to `.env` file:

```
SESSION_SECRET=twilio-lookup-v2-secure-session-secret-change-in-production-2026
SIM_SWAP_PERIOD=30
REASSIGNED_NUMBER_PERIOD=30
```

Note: Generate a secure SESSION_SECRET for production using `openssl rand -base64 32`

- [ ] **Step 2: Verify .env is in .gitignore**

Run: `grep -q "^\.env$" .gitignore && echo "✓ .env is ignored" || echo "✗ Add .env to .gitignore"`

Expected output: ✓ .env is ignored

- [ ] **Step 3: Commit .env changes (template only)**

Note: Do NOT commit actual .env file. Create .env.example instead:

```bash
cat > .env.example << 'EOF'
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid_here
TWILIO_PHONE_NUMBER=your_phone_number_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=your_template_id_here
SENDGRID_FRAUD_ALERT_TEMPLATE_ID=your_template_id_here
SESSION_SECRET=generate_secure_random_key_here
SIM_SWAP_PERIOD=30
REASSIGNED_NUMBER_PERIOD=30
EOF
git add .env.example
git commit -m "docs: add .env.example with new session and lookup config"
```

### Task 3: Add Session Middleware to Express App

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/index.js:1-16`

- [ ] **Step 1: Add express-session import**

Add after line 4 (`const bodyParser = require("body-parser");`):

```javascript
const session = require("express-session");
```

- [ ] **Step 2: Add session middleware configuration**

Add after line 9 (before `.use(express.static(...))`):

```javascript
  .use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true in production with HTTPS
      maxAge: 3600000 // 1 hour
    }
  }))
```

- [ ] **Step 3: Test server starts successfully**

Run: `npm start`

Expected output: Server should start without errors on port 4000

Press Ctrl+C to stop.

- [ ] **Step 4: Commit session middleware**

```bash
git add index.js
git commit -m "feat: add express-session middleware for user data persistence"
```

---

## Chunk 2: Twilio Lookup v2 Service Layer

### Task 4: Add Twilio Lookup v2 Method

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/services/twilio.js:87`

- [ ] **Step 1: Add lookupV2 method after sendCall function**

Add this new method at the end of the module.exports object (after line 86, before the closing brace):

```javascript
  ,

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
          countryCode: userData.country,
          dateOfBirth: userData.date_of_birth,
          // SIM Swap and Reassigned Number parameters
          simSwapPeriod: process.env.SIM_SWAP_PERIOD || '30',
          reassignedNumberPeriod: process.env.REASSIGNED_NUMBER_PERIOD || '30'
        })
        .then(json => {
          resolve(json);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
```

- [ ] **Step 2: Verify syntax is correct**

Run: `node -c services/twilio.js`

Expected output: No output means syntax is valid

- [ ] **Step 3: Commit Twilio Lookup v2 method**

```bash
git add services/twilio.js
git commit -m "feat: add lookupV2 method with Identity Match and fraud checks"
```

---

## Chunk 3: Business Logic Transformation

### Task 5: Add Lookup v2 Data Transformation

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/business/business.js:79`

- [ ] **Step 1: Add transformLookupV2Data method**

Add this new method at the end of the module.exports object (after line 78, before the closing brace):

```javascript
  ,

  transformLookupV2Data: function(lookupResponse) {
    console.log('Lookup v2 Response:', lookupResponse);

    return {
      valid: lookupResponse.valid || false,
      phoneNumber: lookupResponse.phoneNumber || '',

      lineType: {
        carrierName: lookupResponse.lineTypeIntelligence?.carrier_name || 'Unknown',
        phoneType: lookupResponse.lineTypeIntelligence?.type || 'Unknown'
      },

      identityMatch: {
        firstName: lookupResponse.identityMatch?.first_name_match ?? null,
        lastName: lookupResponse.identityMatch?.last_name_match ?? null,
        address: lookupResponse.identityMatch?.address_match ?? null,
        city: lookupResponse.identityMatch?.city_match ?? null,
        state: lookupResponse.identityMatch?.state_match ?? null,
        postalCode: lookupResponse.identityMatch?.postal_code_match ?? null,
        country: lookupResponse.identityMatch?.country_match ?? null,
        dateOfBirth: lookupResponse.identityMatch?.date_of_birth_match ?? null
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

- [ ] **Step 2: Verify syntax is correct**

Run: `node -c business/business.js`

Expected output: No output means syntax is valid

- [ ] **Step 3: Commit business logic transformation**

```bash
git add business/business.js
git commit -m "feat: add transformLookupV2Data for response formatting"
```

---

## Chunk 4: Address Autocomplete Client-Side Code

### Task 6: Create Address Autocomplete JavaScript

**Files:**
- Create: `/Users/akiramoto/Documents/Github/SecureSignIn2026/public/js/address-autocomplete.js`

- [ ] **Step 1: Create public/js directory if it doesn't exist**

Run: `mkdir -p public/js`

- [ ] **Step 2: Create address-autocomplete.js file**

```javascript
/**
 * Nominatim Address Autocomplete
 * Uses OpenStreetMap Nominatim API for free address lookups
 * Rate limit: 1 request/second (respect fair use policy)
 */

(function() {
  let searchTimeout = null;
  let lastRequestTime = 0;
  const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  /**
   * Debounced address search
   */
  function searchAddress(query, countryCode) {
    clearTimeout(searchTimeout);

    if (query.length < 3) {
      hideSuggestions();
      return;
    }

    searchTimeout = setTimeout(function() {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      // Respect 1 request/second rate limit
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        setTimeout(function() {
          performSearch(query, countryCode);
        }, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      } else {
        performSearch(query, countryCode);
      }
    }, 500); // Wait 500ms after user stops typing
  }

  /**
   * Perform actual API request to Nominatim
   */
  function performSearch(query, countryCode) {
    lastRequestTime = Date.now();

    const url = 'https://nominatim.openstreetmap.org/search?' +
      'q=' + encodeURIComponent(query) +
      '&format=json' +
      '&addressdetails=1' +
      '&limit=5' +
      '&countrycodes=' + countryCode.toLowerCase();

    fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      showSuggestions(data);
    })
    .catch(function(error) {
      console.error('Address autocomplete error:', error);
      hideSuggestions();
    });
  }

  /**
   * Display address suggestions dropdown
   */
  function showSuggestions(results) {
    const addressInput = document.getElementById('address');
    const suggestionsDiv = document.getElementById('address-suggestions');

    if (!results || results.length === 0) {
      hideSuggestions();
      return;
    }

    let html = '<ul class="list-group">';
    results.forEach(function(result, index) {
      const addr = result.address || {};
      const displayName = result.display_name || '';

      html += '<li class="list-group-item address-suggestion-item" data-index="' + index + '">' +
        '<div>' + displayName + '</div>' +
        '</li>';
    });
    html += '</ul>';

    suggestionsDiv.innerHTML = html;
    suggestionsDiv.style.display = 'block';

    // Add click handlers
    const items = suggestionsDiv.querySelectorAll('.address-suggestion-item');
    items.forEach(function(item) {
      item.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        selectAddress(results[index]);
      });
    });
  }

  /**
   * Hide suggestions dropdown
   */
  function hideSuggestions() {
    const suggestionsDiv = document.getElementById('address-suggestions');
    if (suggestionsDiv) {
      suggestionsDiv.style.display = 'none';
      suggestionsDiv.innerHTML = '';
    }
  }

  /**
   * User selected an address from suggestions
   */
  function selectAddress(result) {
    const addr = result.address || {};

    // Build street address from components
    let streetAddress = '';
    if (addr.house_number) streetAddress += addr.house_number + ' ';
    if (addr.road) streetAddress += addr.road;

    // Populate form fields
    document.getElementById('address').value = streetAddress || result.display_name;
    document.getElementById('city').value = addr.city || addr.town || addr.village || '';
    document.getElementById('state').value = addr.state || '';
    document.getElementById('postal_code').value = addr.postcode || '';

    hideSuggestions();

    // Trigger validation for auto-filled fields
    $('form').data('bootstrapValidator').revalidateField('address');
    $('form').data('bootstrapValidator').revalidateField('city');
    $('form').data('bootstrapValidator').revalidateField('state');
    $('form').data('bootstrapValidator').revalidateField('postal_code');
  }

  /**
   * Initialize address autocomplete when DOM is ready
   */
  window.initAddressAutocomplete = function() {
    const addressInput = document.getElementById('address');
    const countrySelect = document.getElementById('country');

    if (!addressInput) return;

    // Create suggestions container if it doesn't exist
    let suggestionsDiv = document.getElementById('address-suggestions');
    if (!suggestionsDiv) {
      suggestionsDiv = document.createElement('div');
      suggestionsDiv.id = 'address-suggestions';
      suggestionsDiv.className = 'address-suggestions';
      suggestionsDiv.style.display = 'none';
      addressInput.parentNode.appendChild(suggestionsDiv);
    }

    // Listen for address input
    addressInput.addEventListener('input', function() {
      const countryCode = countrySelect ? countrySelect.value : 'us';
      searchAddress(this.value, countryCode);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
      if (e.target !== addressInput && !suggestionsDiv.contains(e.target)) {
        hideSuggestions();
      }
    });
  };
})();
```

- [ ] **Step 3: Add CSS styles for autocomplete dropdown**

Create `/Users/akiramoto/Documents/Github/SecureSignIn2026/public/css/address-autocomplete.css`:

```css
.address-suggestions {
  position: absolute;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  max-height: 300px;
  overflow-y: auto;
  width: 100%;
  margin-top: 2px;
}

.address-suggestions .list-group {
  margin-bottom: 0;
}

.address-suggestion-item {
  cursor: pointer;
  padding: 10px;
  border-left: none;
  border-right: none;
}

.address-suggestion-item:first-child {
  border-top: none;
  border-radius: 4px 4px 0 0;
}

.address-suggestion-item:last-child {
  border-bottom: none;
  border-radius: 0 0 4px 4px;
}

.address-suggestion-item:hover {
  background-color: #f5f5f5;
}
```

- [ ] **Step 4: Commit address autocomplete code**

```bash
git add public/js/address-autocomplete.js public/css/address-autocomplete.css
git commit -m "feat: add Nominatim address autocomplete with rate limiting"
```

---

## Chunk 5: Update Signup Form UI

### Task 7: Expand Signup Form with New Fields

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/views/pages/index.ejs:1-125`
- Reference: `/Users/akiramoto/Documents/Github/SecureSignIn2026/public/js/address-autocomplete.js`
- Reference: `/Users/akiramoto/Documents/Github/SecureSignIn2026/public/css/address-autocomplete.css`

- [ ] **Step 1: Add CSS link for address autocomplete in header**

Add after line 3 (in the `<head>` section):

```html
    <link rel="stylesheet" href="/css/address-autocomplete.css">
```

- [ ] **Step 2: Replace full_name field with first_name and last_name**

Replace lines 17-19 (the full_name input) with:

```html
            <div class="form-group">
              <input type="text" id="first_name" name="first_name" class="form-control" placeholder="First name" required />
            </div>

            <div class="form-group">
              <input type="text" id="last_name" name="last_name" class="form-control" placeholder="Last name" required />
            </div>
```

- [ ] **Step 3: Add address fields before email field**

Add after the last_name field, before the email field (around line 20):

```html
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

            <div class="form-group">
              <select id="country" name="country" class="form-control" required>
                <option value="US" selected>United States</option>
                <option value="CA">Canada</option>
                <option value="MX">Mexico</option>
              </select>
            </div>

            <div class="form-group">
              <input type="date" id="date_of_birth" name="date_of_birth" class="form-control" placeholder="Date of Birth" required />
            </div>
```

- [ ] **Step 4: Update localStorage keys in script section**

Replace lines 43-45 (localStorage.removeItem calls) with:

```javascript
        localStorage.removeItem("19q3.first_name");
        localStorage.removeItem("19q3.last_name");
        localStorage.removeItem("19q3.address");
        localStorage.removeItem("19q3.city");
        localStorage.removeItem("19q3.state");
        localStorage.removeItem("19q3.postal_code");
        localStorage.removeItem("19q3.country");
        localStorage.removeItem("19q3.date_of_birth");
        localStorage.removeItem("19q3.email_address");
        localStorage.removeItem("19q3.mobile_phone_number");
```

- [ ] **Step 5: Add address autocomplete initialization**

Add after line 53 (after intlTelInput initialization):

```javascript
        // Initialize address autocomplete
        initAddressAutocomplete();
```

- [ ] **Step 6: Update bootstrapValidator fields configuration**

Replace the `fields` configuration (lines 64-103) with:

```javascript
          fields: {
            first_name: {
              message: "This does not seem like a valid first name",
              validators: {
                notEmpty: {
                  message: "First name is required and cannot be empty"
                },
                stringLength: {
                  min: 2,
                  max: 50,
                  message: "First name must be between 2 and 50 characters"
                },
                regexp: {
                  regexp: /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/,
                  message: "First name contains invalid characters"
                }
              }
            },
            last_name: {
              message: "This does not seem like a valid last name",
              validators: {
                notEmpty: {
                  message: "Last name is required and cannot be empty"
                },
                stringLength: {
                  min: 2,
                  max: 50,
                  message: "Last name must be between 2 and 50 characters"
                },
                regexp: {
                  regexp: /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/,
                  message: "Last name contains invalid characters"
                }
              }
            },
            address: {
              validators: {
                notEmpty: {
                  message: "Street address is required"
                },
                stringLength: {
                  min: 5,
                  max: 200,
                  message: "Address must be between 5 and 200 characters"
                }
              }
            },
            city: {
              validators: {
                notEmpty: {
                  message: "City is required"
                },
                stringLength: {
                  min: 2,
                  max: 100,
                  message: "City must be between 2 and 100 characters"
                }
              }
            },
            state: {
              validators: {
                notEmpty: {
                  message: "State is required"
                },
                stringLength: {
                  min: 2,
                  max: 50,
                  message: "State must be at least 2 characters"
                }
              }
            },
            postal_code: {
              validators: {
                notEmpty: {
                  message: "Postal code is required"
                },
                stringLength: {
                  min: 3,
                  max: 10,
                  message: "Postal code must be between 3 and 10 characters"
                }
              }
            },
            country: {
              validators: {
                notEmpty: {
                  message: "Country is required"
                }
              }
            },
            date_of_birth: {
              validators: {
                notEmpty: {
                  message: "Date of birth is required"
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
              trigger: "blur",
              validators: {
                remote: {
                  url: "/email_validation"
                }
              }
            },
            mobile_phone_number: {
              trigger: "blur",
              validators: {
                remote: {
                  url: "/lookup",
                  data: function() {
                    return {
                      mobile_number: window.iti.getNumber(intlTelInputUtils.numberFormat.E164)
                    };
                  }
                }
              }
            }
          }
```

- [ ] **Step 7: Update form submission to save all fields**

Replace lines 107-119 (form submission handler) with:

```javascript
        // make sure to submit the E.164 value rather than the raw entered value
        $("#signup-form").submit(function(e) {
          e.preventDefault();

          let first_name = $("#first_name").val();
          let last_name = $("#last_name").val();
          let address = $("#address").val();
          let city = $("#city").val();
          let state = $("#state").val();
          let postal_code = $("#postal_code").val();
          let country = $("#country").val();
          let date_of_birth = $("#date_of_birth").val();
          let email_address = $("#email_address").val();
          let mobile_phone_number = window.iti.getNumber(intlTelInputUtils.numberFormat.E164);
          $("#mobile_phone_number").val(mobile_phone_number);

          localStorage.setItem("19q3.first_name", first_name);
          localStorage.setItem("19q3.last_name", last_name);
          localStorage.setItem("19q3.address", address);
          localStorage.setItem("19q3.city", city);
          localStorage.setItem("19q3.state", state);
          localStorage.setItem("19q3.postal_code", postal_code);
          localStorage.setItem("19q3.country", country);
          localStorage.setItem("19q3.date_of_birth", date_of_birth);
          localStorage.setItem("19q3.email_address", email_address);
          localStorage.setItem("19q3.mobile_phone_number", mobile_phone_number);

          this.submit();
        });
```

- [ ] **Step 8: Add script tag for address autocomplete**

Add before the closing `</body>` tag:

```html
    <script src="/js/address-autocomplete.js"></script>
```

- [ ] **Step 9: Test signup form loads correctly**

Run: `npm start`

Visit: http://localhost:4000

Expected: Form displays with 10 fields (first name, last name, address, city, state, postal code, country dropdown, date of birth, email, phone)

Press Ctrl+C to stop.

- [ ] **Step 10: Commit signup form updates**

```bash
git add views/pages/index.ejs
git commit -m "feat: expand signup form to 10 fields with address autocomplete"
```

---

## Chunk 6: Update Phone Verification Page

### Task 8: Update Phone Verification Form Fields

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/views/pages/phone_verification.ejs:16-27`

- [ ] **Step 1: Replace full_name field with first_name and last_name**

Replace lines 17-19 with:

```html
            <div class="form-group">
              <input type="text" id="first_name" name="first_name" class="form-control" placeholder="First name" disabled value="<%- formData.first_name %>" />
            </div>

            <div class="form-group">
              <input type="text" id="last_name" name="last_name" class="form-control" placeholder="Last name" disabled value="<%- formData.last_name %>" />
            </div>

            <div class="form-group">
              <input type="text" id="address" name="address" class="form-control" placeholder="Address" disabled value="<%- formData.address %>" />
            </div>

            <div class="form-group">
              <input type="text" id="city" name="city" class="form-control" placeholder="City" disabled value="<%- formData.city %>" />
            </div>

            <div class="form-group">
              <input type="text" id="state" name="state" class="form-control" placeholder="State" disabled value="<%- formData.state %>" />
            </div>

            <div class="form-group">
              <input type="text" id="postal_code" name="postal_code" class="form-control" placeholder="Postal Code" disabled value="<%- formData.postal_code %>" />
            </div>

            <div class="form-group">
              <input type="text" id="country" name="country" class="form-control" placeholder="Country" disabled value="<%- formData.country %>" />
            </div>

            <div class="form-group">
              <input type="text" id="date_of_birth" name="date_of_birth" class="form-control" placeholder="Date of Birth" disabled value="<%- formData.date_of_birth %>" />
            </div>
```

- [ ] **Step 2: Test phone verification page displays all fields**

Note: This will be tested after routing is updated in next chunk.

- [ ] **Step 3: Commit phone verification updates**

```bash
git add views/pages/phone_verification.ejs
git commit -m "feat: display all 10 user fields on phone verification page"
```

---

## Chunk 7: Update Routing Layer

### Task 9: Update Phone Verification Route with Lookup v2

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/routes/routes.js:10-15`

- [ ] **Step 1: Replace POST /phone_verification route**

Replace lines 10-15 with:

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
        twilio.verify(userData.mobile_phone_number)
          .then(() => {
            res.render("pages/phone_verification", {
              formData: userData
            });
          })
          .catch(verifyError => {
            console.error('Verification error:', verifyError);
            res.status(500).send('Error processing signup');
          });
      });
  });
```

- [ ] **Step 2: Add lookup results route**

Add after the existing GET /preferences route (around line 19):

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

- [ ] **Step 3: Verify syntax is correct**

Run: `node -c routes/routes.js`

Expected output: No output means syntax is valid

- [ ] **Step 4: Commit routing updates**

```bash
git add routes/routes.js
git commit -m "feat: integrate Lookup v2 in signup and add lookup results route"
```

---

## Chunk 8: Update Preferences Page

### Task 10: Add View Lookup Results Button

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/views/pages/preferences.ejs:94-100`

- [ ] **Step 1: Update localStorage retrieval to use first_name and last_name**

Replace lines 105-107 with:

```javascript
        let first_name = localStorage.getItem("19q3.first_name");
        let last_name = localStorage.getItem("19q3.last_name");
        let email_address = localStorage.getItem("19q3.email_address");
        let mobile_phone_number = localStorage.getItem("19q3.mobile_phone_number");

        $("#full_name").html(first_name + " " + last_name);
```

- [ ] **Step 2: Add View Lookup Results section**

Add after the SMS Marketing link section (after line 99, before closing `</article>`):

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

- [ ] **Step 3: Commit preferences page updates**

```bash
git add views/pages/preferences.ejs
git commit -m "feat: add View Lookup Results button to preferences page"
```

---

## Chunk 9: Create Lookup Results Page

### Task 11: Create Lookup Results Display Page

**Files:**
- Create: `/Users/akiramoto/Documents/Github/SecureSignIn2026/views/pages/lookup_results.ejs`

- [ ] **Step 1: Create lookup_results.ejs file**

Create the complete file:

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
      .table { margin-bottom: 0; }
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
                  <span class="text-danger">&#10007; Yes</span>
                <% } else { %>
                  <span class="text-success">&#10003; No</span>
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
                  <span class="text-danger">&#10007; Yes</span>
                <% } else { %>
                  <span class="text-success">&#10003; No</span>
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

- [ ] **Step 2: Test lookup results page renders correctly**

Note: This will be tested in manual testing after full integration.

- [ ] **Step 3: Commit lookup results page**

```bash
git add views/pages/lookup_results.ejs
git commit -m "feat: create lookup results page with identity match scores"
```

---

## Chunk 10: Manual Integration Testing

### Task 12: End-to-End Testing

**Files:**
- Test: All components together

- [ ] **Step 1: Start the application**

Run: `npm start`

Expected output: Server starts on port 4000

- [ ] **Step 2: Test complete signup flow**

1. Visit: http://localhost:4000
2. Fill in all 10 fields:
   - First Name: John
   - Last Name: Doe
   - Address: Start typing a real address (test Nominatim autocomplete)
   - Select address from dropdown (verify City, State, Postal Code auto-populate)
   - Country: Leave as US (default)
   - Date of Birth: Select a date that makes you 18+ years old
   - Email: Enter valid email
   - Phone: Enter valid phone number

3. Submit form

Expected: Redirects to phone verification page showing all 10 fields disabled

- [ ] **Step 3: Test phone verification**

1. Enter the verification code sent to your phone
2. Click Continue

Expected: Redirects to preferences page

- [ ] **Step 4: Test View Lookup Results button**

1. On preferences page, click "View Lookup Results" button

Expected: Navigates to /lookup-results page showing:
- Line Type Intelligence section with carrier name and phone type
- Identity Match Scores table with 8 rows and color-coded scores
- SIM Swap Check section with Yes/No and date
- Reassigned Number Check section with Yes/No and date
- Back to Preferences button

- [ ] **Step 5: Test session expiry**

1. Wait 1+ hour (or manually delete session cookie)
2. Try to access http://localhost:4000/lookup-results

Expected: Redirects to homepage (/)

- [ ] **Step 6: Test address autocomplete rate limiting**

1. Go to homepage
2. Type rapidly in address field
3. Verify requests are debounced (check Network tab in browser DevTools)

Expected: Only 1 request per second to Nominatim API

- [ ] **Step 7: Create manual testing report**

Run: `mkdir -p docs/testing`

Create: `/Users/akiramoto/Documents/Github/SecureSignIn2026/docs/testing/2026-03-17-manual-test-results.md`

Document all test results:
- ✓ Passed tests
- ✗ Failed tests with details
- Screenshots (optional)

- [ ] **Step 8: Commit testing documentation**

```bash
git add docs/testing/2026-03-17-manual-test-results.md
git commit -m "docs: add manual testing results for Lookup v2 integration"
```

---

## Chunk 11: Documentation and Cleanup

### Task 13: Update README and Documentation

**Files:**
- Modify: `/Users/akiramoto/Documents/Github/SecureSignIn2026/README.md`

- [ ] **Step 1: Update README with new features**

Add section describing Twilio Lookup v2 integration:

```markdown
## Features

### Twilio Lookup v2 Integration

This application now uses Twilio's Lookup v2 API with:

- **Line Type Intelligence**: Identifies carrier name and phone type (mobile/landline/voip)
- **Identity Match**: Verifies user identity against phone number with 8-field scoring
- **SIM Swap Detection**: Checks for recent SIM swap activity
- **Reassigned Number Detection**: Identifies recently reassigned phone numbers

### Enhanced Signup Form

Collects comprehensive user information:
- First Name, Last Name
- Street Address (with Nominatim autocomplete)
- City, State, Postal Code
- Country (US, CA, MX)
- Date of Birth (18+ validation)
- Email Address
- Mobile Phone Number

### Address Autocomplete

Uses OpenStreetMap Nominatim API for free address lookups with auto-population of City, State, and Postal Code fields.

### Session Management

User data and lookup results are stored in server-side sessions for 1 hour, enabling verification results display on a dedicated page.

## Environment Variables

Required environment variables in `.env`:

```
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
TWILIO_PHONE_NUMBER=your_phone_number

# SendGrid Configuration
SENDGRID_API_KEY=your_api_key
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=your_template_id
SENDGRID_FRAUD_ALERT_TEMPLATE_ID=your_template_id

# Session Configuration
SESSION_SECRET=generate_secure_random_key_here

# Lookup Configuration
SIM_SWAP_PERIOD=30
REASSIGNED_NUMBER_PERIOD=30
```

## API Rate Limits

- **Nominatim API**: 1 request/second (respect fair use policy)
- **Twilio Lookup v2**: No hard limit, but charged per lookup

## Browser Compatibility

- HTML5 date picker supported in all modern browsers
- Address autocomplete works with fetch/XMLHttpRequest
- Bootstrap 3 compatible with IE10+ and all modern browsers
```

- [ ] **Step 2: Commit README updates**

```bash
git add README.md
git commit -m "docs: update README with Lookup v2 features and configuration"
```

### Task 14: Final Code Review and Cleanup

**Files:**
- Review: All modified files

- [ ] **Step 1: Review all code for console.log statements**

Run: `grep -r "console.log" services/ business/ routes/ --color`

Remove or comment out any debug console.log statements in production code (keep error logging).

- [ ] **Step 2: Verify no sensitive data in git**

Run: `git status`

Ensure `.env` file is not staged or committed.

- [ ] **Step 3: Run syntax check on all JavaScript files**

Run:
```bash
node -c index.js
node -c services/twilio.js
node -c business/business.js
node -c routes/routes.js
node -c public/js/address-autocomplete.js
```

Expected: No errors

- [ ] **Step 4: Check for TODO/FIXME comments**

Run: `grep -r "TODO\|FIXME" . --exclude-dir=node_modules --exclude-dir=.git`

Document any TODOs in GitHub Issues or fix them.

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: code cleanup and remove debug statements"
```

---

## Summary

This plan implements the complete Twilio Lookup v2 modernization:

✅ **Completed Components:**
1. Package dependencies (express-session, twilio v4)
2. Environment configuration (SESSION_SECRET, periods)
3. Session middleware integration
4. Twilio Lookup v2 service method
5. Business logic transformation
6. Address autocomplete (Nominatim)
7. Expanded signup form (10 fields)
8. Updated phone verification page
9. Routing layer updates
10. Preferences page button
11. Lookup results display page
12. Manual integration testing
13. Documentation updates

**Next Steps:**
1. Deploy to staging environment
2. Test with real Twilio Lookup v2 API credentials
3. Monitor API costs and rate limits
4. Gather user feedback on address autocomplete
5. Consider adding database persistence for analytics

**Architecture Benefits:**
- Clean separation of concerns (service → business → routes → views)
- Session-based data flow (no database dependency)
- Graceful error handling (signup continues if Lookup fails)
- Rate-limited external API calls (respects Nominatim fair use)
- Color-coded results display (user-friendly verification feedback)

**Security Considerations:**
- SESSION_SECRET must be changed in production
- HTTPS required for secure session cookies
- Input validation on all 10 form fields
- XSS prevention in EJS templates
- Rate limiting on address autocomplete
