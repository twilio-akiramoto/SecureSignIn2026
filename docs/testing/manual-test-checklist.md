# Manual Testing Checklist for Twilio Lookup v2 Modernization

## Prerequisites
- Server running on port 4000
- Valid Twilio credentials in .env
- Valid SendGrid credentials in .env
- Browser with developer tools open

## Test Scenarios

### 1. Signup Form - All Fields
- [ ] Navigate to http://localhost:4000
- [ ] Verify all 10 fields are visible
- [ ] Verify Twilio logo displays correctly

### 2. Address Autocomplete
- [ ] Type "1600 Pennsylvania" in address field
- [ ] Verify suggestions dropdown appears
- [ ] Select an address from dropdown
- [ ] Verify City, State, Postal Code auto-populate
- [ ] Check Network tab: max 1 request/second to Nominatim

### 3. Form Validation
- [ ] Try submitting with empty fields - should fail
- [ ] Enter age < 18 in Date of Birth - should fail with error message
- [ ] Enter invalid email - should fail
- [ ] Enter invalid phone number - should fail
- [ ] Fill all fields correctly - should pass

### 4. Phone Verification Flow
- [ ] Submit valid form
- [ ] Verify redirect to /phone_verification
- [ ] Verify all 10 fields display (disabled)
- [ ] Check SMS received on phone
- [ ] Enter verification code
- [ ] Verify redirect to /preferences

### 5. Preferences Page
- [ ] Verify welcome message shows first_name + last_name
- [ ] Verify "View Lookup Results" button exists
- [ ] Test communication preference toggles (optional)

### 6. Lookup Results Page
- [ ] Click "View Lookup Results" button
- [ ] Verify Line Type Intelligence section displays
  - [ ] Carrier Name shows correctly
  - [ ] Phone Type shows (mobile/landline/voip)
- [ ] Verify Identity Match Scores table displays
  - [ ] 8 rows (First Name through Date of Birth)
  - [ ] Scores show as X/100 or "Not Available"
  - [ ] Colors: Green (80-100), Yellow (50-79), Red (0-49)
- [ ] Verify SIM Swap Check section displays
  - [ ] Shows Yes/No with checkmark/X
  - [ ] Shows date or "N/A"
- [ ] Verify Reassigned Number section displays
  - [ ] Shows Yes/No with checkmark/X
  - [ ] Shows date or "N/A"
- [ ] Click "Back to Preferences" - should return

### 7. Session Expiry
- [ ] Wait 1+ hour (or clear cookies)
- [ ] Try to access /lookup-results directly
- [ ] Should redirect to homepage

### 8. Error Handling
- [ ] Submit form with invalid Twilio credentials (test only)
- [ ] Verify signup continues even if Lookup fails
- [ ] Check console for error messages

## Expected Results Summary

✅ All fields validate correctly  
✅ Address autocomplete works with rate limiting  
✅ Twilio Lookup v2 API call succeeds  
✅ Identity Match scores display  
✅ SIM Swap and Reassigned Number data shows  
✅ Session persists across pages  
✅ Session expires after 1 hour  
✅ Error handling works gracefully  

## Notes

- Console logs in business.js show Lookup v2 responses (useful for debugging)
- Twilio Lookup v2 incurs charges per lookup
- Nominatim respects 1 request/second rate limit
