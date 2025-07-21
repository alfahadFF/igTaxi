# SMS Consent Documentation for Twilio Number Purchase

This folder contains the documentation required by Twilio to purchase a phone number for sending verification messages.

## Files Created

### 1. `sms-consent-proof.html`
A comprehensive HTML page that serves as proof of consent for SMS messaging. This page documents:

- **User Consent Process**: How users explicitly consent to receive SMS messages during app registration
- **Message Types**: Detailed list of SMS types sent (OTP, booking confirmations, trip updates, etc.)
- **Frequency**: Expected message frequency per user per month
- **Opt-out Mechanism**: Clear instructions on how users can unsubscribe
- **Contact Information**: Company details and support contacts
- **Compliance**: Legal compliance with Jordanian data protection laws

### 2. App Legal Pages (app/legal/)
- `sms-consent.tsx` - In-app SMS consent policy
- `privacy-policy.tsx` - Privacy policy
- `terms-of-service.tsx` - Terms of service
- `_layout.tsx` - Navigation layout for legal pages

## Hosting Instructions

### Option 1: Host on Your Domain
1. Upload `sms-consent-proof.html` to your website root
2. Make it accessible at: `https://yourdomain.com/sms-consent-proof.html`
3. Provide this URL to Twilio

### Option 2: GitHub Pages (Free)
1. Create a new GitHub repository
2. Upload the HTML file
3. Enable GitHub Pages in repository settings
4. Use the generated URL: `https://username.github.io/repository/sms-consent-proof.html`

### Option 3: Netlify/Vercel (Free)
1. Create account on Netlify or Vercel
2. Deploy the HTML file
3. Use the generated URL

### Option 4: Expo/React Native Web
1. The file is already in the `public` folder
2. When you deploy your web version, it will be accessible at:
   `https://yourapp.com/sms-consent-proof.html`

## What Twilio Needs

When purchasing a Twilio phone number, provide them with:

1. **URL to the consent page**: The publicly accessible URL where `sms-consent-proof.html` is hosted

2. **Business Information**:
   - Company Name: IGTaxi
   - Business Type: Transportation & Delivery Services
   - Country: Jordan
   - Use Case: Ride-hailing app with multi-service platform

3. **Message Types Documentation**:
   - OTP/Verification codes
   - Booking confirmations
   - Trip status updates
   - Emergency/Safety notifications
   - Administrative messages (no marketing)

## Key Points for Twilio Submission

✅ **Explicit Consent**: Users must click "Send Verification Code" after reading policies
✅ **Clear Opt-out**: Multiple ways to unsubscribe (STOP keyword, app settings, support)
✅ **Transparent Messaging**: All message types clearly documented
✅ **Contact Information**: Full business contact details provided
✅ **Compliance**: Follows Jordanian telecommunications regulations
✅ **Public Access**: Consent documentation is publicly accessible

## Additional Notes

- The consent page is in Arabic (primary user language) with professional styling
- All legal pages are integrated into the mobile app with proper navigation
- Users see legal links during registration process
- No marketing messages are sent (only transactional/security messages)
- Estimated frequency: 5-15 messages per user per month based on usage

## Contact for Twilio Support

If Twilio requests additional information:
- **Technical Contact**: [Your Email]
- **Business Contact**: support@igtaxi.com
- **Phone**: +962-6-1234567
- **Address**: Amman, Jordan

## URLs to Provide to Twilio

Replace `yourdomain.com` with your actual domain:

1. **Main Consent Page**: `https://yourdomain.com/sms-consent-proof.html`
2. **Privacy Policy**: `https://yourdomain.com/legal/privacy-policy` (when web app is deployed)
3. **Terms of Service**: `https://yourdomain.com/legal/terms-of-service` (when web app is deployed)

Make sure the consent page is publicly accessible and loads properly before submitting to Twilio.
