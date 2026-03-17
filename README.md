# Secure Account Signups with Twilio Lookup v2

A Node.js/Express application demonstrating secure account signups with comprehensive phone number verification using Twilio's Lookup v2 API.

## Features

### Twilio Lookup v2 Integration

This application uses Twilio's Lookup v2 API with advanced verification features:

- **Line Type Intelligence**: Identifies carrier name and phone type (mobile/landline/voip)
- **Identity Match**: Verifies user identity against phone number with 8-field scoring
  - First Name, Last Name, Address, City, State, Postal Code, Country, Date of Birth
  - Provides 0-100 match scores for each field
- **SIM Swap Detection**: Checks for recent SIM swap activity (configurable period)
- **Reassigned Number Detection**: Identifies recently reassigned phone numbers (configurable period)

### Enhanced Signup Form

Collects comprehensive user information with real-time validation:

- **Personal Information**: First Name, Last Name, Date of Birth (18+ validation)
- **Address Details**: Street Address with autocomplete, City, State, Postal Code
- **Country Selection**: United States, Canada, Mexico
- **Contact Information**: Email Address (validated via SendGrid), Mobile Phone Number
- **Address Autocomplete**: Powered by OpenStreetMap Nominatim API
  - Auto-populates City, State, and Postal Code
  - Rate-limited to respect API fair use policy (1 request/second)

### Session Management

- Server-side session storage using express-session
- Secure cookie configuration
- 1-hour session lifetime
- Stores user data and lookup results between pages

### Phone Verification

- SMS-based phone verification using Twilio Verify
- Multi-step signup flow: Signup → Verification → Preferences → Results

### Results Display

Dedicated page showing comprehensive verification results:
- Color-coded identity match scores (Green: 80-100, Yellow: 50-79, Red: 0-49)
- Carrier and phone type information
- SIM swap status and dates
- Number reassignment status and dates

## Prerequisites

- Node.js 16.15.1 or higher
- npm
- Twilio account with:
  - Account SID and Auth Token
  - Verify Service SID
  - Phone number for SMS
- SendGrid account with:
  - Validation API Key
  - Email API Key
  - Email templates (optional)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SecureSignIn2026
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see Configuration section below)

4. Start the application:
```bash
npm start
```

5. Open your browser to http://localhost:4000

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

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

# Session Configuration
SESSION_SECRET=generate_secure_random_key_here

# Lookup Configuration (days)
SIM_SWAP_PERIOD=30
REASSIGNED_NUMBER_PERIOD=30
```

### Generating a Secure Session Secret

Use OpenSSL to generate a cryptographically secure session secret:

```bash
openssl rand -base64 32
```

Copy the output and use it as your `SESSION_SECRET` value.

### Twilio Lookup v2 Configuration

The application uses Twilio Lookup v2 with the following add-ons:
- Line Type Intelligence
- Identity Match
- SIM Swap (configurable period via `SIM_SWAP_PERIOD`)
- Reassigned Number (configurable period via `REASSIGNED_NUMBER_PERIOD`)

**Note**: These add-ons incur additional charges per lookup. Review Twilio's pricing before deploying to production.

## API Rate Limits

### Nominatim (OpenStreetMap)
- **Rate Limit**: 1 request/second
- **Implementation**: Client-side debouncing (500ms) + rate limiting
- **Cost**: Free (respect fair use policy)

### Twilio Lookup v2
- **Rate Limit**: No hard limit
- **Cost**: Pay per lookup + add-on charges
- **Recommendation**: Consider caching results to minimize API calls

## Architecture

### Tech Stack
- **Backend**: Node.js, Express 4.17
- **Session**: express-session 1.17+
- **Twilio**: twilio SDK 4.x
- **Templating**: EJS
- **Frontend**: Bootstrap 3, jQuery, bootstrapValidator
- **Address Autocomplete**: Nominatim API (OpenStreetMap)

### Data Flow

```
User fills signup form (10 fields)
         ↓
Client-side validation (bootstrapValidator)
         ↓
Submit to POST /phone_verification
         ↓
Server calls Twilio Lookup v2 + Identity Match
         ↓
Store form data + results in express-session
         ↓
SMS verification code sent
         ↓
User enters verification code
         ↓
Redirect to preferences page
         ↓
Click "View Lookup Results"
         ↓
Display cached verification data
```

### File Structure

```
SecureSignIn2026/
├── index.js                 # Express app configuration
├── routes/
│   └── routes.js           # API routes and handlers
├── services/
│   ├── twilio.js           # Twilio API integration (v1 & v2)
│   └── sendgrid.js         # SendGrid email validation
├── business/
│   └── business.js         # Business logic and data transformation
├── views/
│   ├── pages/
│   │   ├── index.ejs                 # Signup form (10 fields)
│   │   ├── phone_verification.ejs    # Verification code entry
│   │   ├── preferences.ejs           # Communication preferences
│   │   └── lookup_results.ejs        # Verification results display
│   └── partials/
│       ├── header.ejs
│       └── nav.ejs
├── public/
│   ├── js/
│   │   └── address-autocomplete.js  # Nominatim integration
│   └── css/
│       └── address-autocomplete.css
├── .env                     # Environment variables (not committed)
└── .env.example            # Environment template
```

## Browser Compatibility

- **HTML5 Date Picker**: Supported in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Address Autocomplete**: Works with fetch/XMLHttpRequest (IE11+)
- **Session Cookies**: Server-side, no browser requirements
- **Bootstrap 3**: Compatible with IE10+ and all modern browsers

## Security Considerations

### Production Deployment

1. **HTTPS Required**: Set `cookie.secure: true` in session configuration
2. **Strong Session Secret**: Use `openssl rand -base64 32` to generate
3. **Environment Variables**: Never commit `.env` to version control
4. **API Credentials**: Rotate Twilio and SendGrid keys periodically
5. **Session Store**: Consider Redis or MongoDB for production (current: memory-based)

### Data Privacy

- Personal data stored in session only (not persisted to database)
- Sessions expire after 1 hour
- No logging of PII in production
- Consider GDPR compliance for EU users

### Input Validation

- Client-side: bootstrapValidator with regex patterns
- Server-side: Twilio Lookup v2 validates phone numbers
- Age validation: Must be 18+ years old
- XSS prevention: EJS uses `<%=` for escaped output

## Testing

### Manual Testing

Run the application and test the complete flow:

1. **Signup Form**:
   - Fill all 10 fields
   - Test address autocomplete
   - Verify age validation (< 18 should fail)
   - Verify email validation
   - Verify phone validation

2. **Phone Verification**:
   - Enter verification code sent via SMS
   - Verify all fields display correctly (disabled)

3. **Preferences Page**:
   - Verify "View Lookup Results" button appears
   - Test communication preference toggles

4. **Lookup Results Page**:
   - Verify all sections display
   - Check identity match score colors
   - Verify SIM swap/reassignment dates

### Syntax Validation

```bash
# Check all JavaScript files
node -c index.js
node -c services/twilio.js
node -c business/business.js
node -c routes/routes.js
node -c public/js/address-autocomplete.js
```

## Troubleshooting

### Server Won't Start

- Check that port 4000 is available
- Verify all environment variables are set in `.env`
- Run `npm install` to ensure dependencies are installed

### Address Autocomplete Not Working

- Check browser console for API errors
- Verify Nominatim API is accessible (not blocked by firewall)
- Ensure rate limiting is not exceeded (1 req/sec)

### Lookup v2 Errors

- Verify Twilio credentials in `.env`
- Check Twilio account has Lookup v2 enabled
- Verify sufficient account balance for add-on charges
- Check Twilio API logs for detailed error messages

### Session Not Persisting

- Verify `SESSION_SECRET` is set in `.env`
- Check browser allows cookies
- For production, use Redis or MongoDB session store

## Cost Considerations

### Twilio Lookup v2 Pricing

Each lookup with all add-ons incurs:
- Base Lookup v2 charge
- Line Type Intelligence charge
- Identity Match charge
- SIM Swap charge
- Reassigned Number charge

**Recommendation**: Review [Twilio Pricing](https://www.twilio.com/lookup/pricing) and implement result caching for production use.

### Nominatim API

- **Cost**: Free
- **Condition**: Respect fair use policy (1 request/second)
- **Alternative**: Upgrade to Google Places or Mapbox for higher limits

## Future Enhancements

### Planned Features

1. **Database Integration**: Store user signups and lookup history
2. **Real-Time Blocking**: Block signups based on identity match scores
3. **Analytics Dashboard**: Track verification trends and fraud patterns
4. **Enhanced Address Validation**: Upgrade to Google Places API
5. **User Dashboard**: Allow users to update information and re-verify

### Potential Improvements

- Add unit and integration tests
- Implement CSRF protection
- Add rate limiting for API endpoints
- Support additional countries beyond US/CA/MX
- Add multi-language support
- Implement Redis session store for production

## License

MIT

## Support

For issues and questions:
- Twilio Lookup v2 API: https://www.twilio.com/docs/lookup/v2-api
- Twilio Support: https://support.twilio.com
- Nominatim API: https://nominatim.org

## Author

Built with Twilio Lookup v2 API integration
