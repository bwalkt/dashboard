# TODO - PZero Mobile

## High Priority

- [ ] Define and integrate TypeScript types for server communication
  - Create comprehensive type definitions for API requests/responses
  - Ensure type safety across client-server interactions
  - Document API contract

- [ ] Implement Bluetooth communication with desktop verifier
  - Complete Bluetooth service implementation
  - Handle authorization requests from desktop
  - Implement request/response protocol
  - Add connection status monitoring
  - Handle reconnection scenarios

## Core Features

- [ ] Authorization flow implementation
  - UI for incoming authorization requests
  - Approve/deny action handling
  - Request details display (endpoint, method, metadata)
  - Request history and logging
  - Timeout handling for stale requests

- [ ] Device pairing and management
  - Complete ConnectDevice screen implementation
  - QR code scanning for device pairing
  - Device list management
  - Remove/unpair device functionality
  - Multi-device support

## Authentication & Security

- [ ] Biometric authentication enhancements
  - Fallback to PIN/password
  - Re-authentication timeout configuration
  - Biometric settings management
  - Handle biometric enrollment changes

- [ ] Secure storage
  - Implement encrypted storage for sensitive data
  - Secure credential management
  - Key rotation strategy

## UI/UX Improvements

- [ ] Settings screen enhancements
  - Profile management
  - Notification preferences
  - Bluetooth settings
  - Security settings
  - Theme customization
  - App preferences

- [ ] Home screen features
  - Recent authorization requests
  - Connection status display
  - Quick actions
  - Statistics/analytics

- [ ] Endpoints screen implementation
  - Endpoint list management
  - Add/edit/remove endpoints
  - Endpoint import functionality
  - Search and filtering

- [ ] Notifications
  - Push notification setup
  - Local notifications for authorization requests
  - Notification sound/vibration settings
  - Notification history

## Network & Communication

- [ ] API integration
  - Implement REST API client
  - Request/response interceptors
  - Error handling and retry logic
  - Network status monitoring
  - Offline mode support

- [ ] Real-time communication
  - WebSocket/Centrifugo integration
  - Real-time status updates
  - Connection health monitoring

## Data Management

- [ ] State management optimization
  - Review and optimize Zustand stores
  - Implement data persistence strategy
  - Add state hydration/rehydration
  - Cache management

- [ ] Local database
  - Set up local database (SQLite/Realm)
  - Schema design for offline data
  - Data synchronization strategy
  - Migration handling

## Platform-Specific

### iOS
- [ ] Polish iOS-specific UI/UX
- [ ] iOS app icon and splash screen
- [ ] iOS permissions handling
- [ ] Background Bluetooth on iOS
- [ ] App Store preparation

### Android
- [ ] Polish Android-specific UI/UX
- [ ] Android app icon and splash screen
- [ ] Android permissions handling
- [ ] Background services for Bluetooth
- [ ] Play Store preparation

## Performance & Optimization

- [ ] Performance profiling
  - Identify and fix render bottlenecks
  - Optimize list rendering
  - Image loading optimization
  - Memory leak detection

- [ ] App size optimization
  - Bundle size analysis
  - Remove unused dependencies
  - Implement code splitting where possible
  - Asset optimization

## Testing

- [ ] Unit tests
  - Component tests
  - Store tests
  - Utility function tests
  - Service layer tests

- [ ] Integration tests
  - Navigation flow tests
  - Authentication flow tests
  - Bluetooth communication tests

- [ ] E2E tests
  - Critical user flows
  - Authorization flow
  - Device pairing flow

## DevOps & CI/CD

- [ ] Set up CI/CD pipeline
  - Automated builds for iOS/Android
  - Automated testing
  - Code quality checks
  - Beta distribution (TestFlight/Play Beta)

- [ ] Build configuration
  - Environment-specific builds (dev/staging/prod)
  - Build signing and certificates
  - Version management

## Error Handling & Monitoring

- [ ] Error tracking
  - Integrate crash reporting (Sentry/Bugsnag)
  - Error boundary implementation
  - Graceful error handling

- [ ] Analytics
  - User analytics integration
  - Feature usage tracking
  - Performance monitoring

## Documentation

- [ ] Developer documentation
  - Setup and installation guide
  - Architecture overview
  - Component documentation
  - State management guide

- [ ] User documentation
  - User guide/help section
  - FAQ
  - Troubleshooting guide

## Accessibility

- [ ] Accessibility improvements
  - Screen reader support
  - Proper ARIA labels
  - Keyboard navigation
  - Color contrast compliance
  - Font size scaling

## Internationalization

- [ ] i18n setup
  - Set up i18n library
  - Extract strings for translation
  - Add language selection
  - RTL language support

## Future Enhancements

- [ ] Dark/light theme toggle
- [ ] Custom authorization policies
- [ ] Geolocation-based authorization
- [ ] Time-based authorization rules
- [ ] Trusted locations management
- [ ] Backup and restore functionality
- [ ] Export settings/configuration
- [ ] Widget support (iOS/Android)
- [ ] Watch app integration (Apple Watch/Wear OS)
- [ ] Tablet/iPad optimization


⏺ Tier 3: Banking-Grade SIM Verification

  Here's how each component works:

  ---
  1. SIM-Based Verification (tru.ID or similar)

  How it works technically:

  Network-Level Authentication:
  1. User enters phone number in your app
  2. App makes HTTPS request to verification service over mobile data (must disable WiFi temporarily)
  3. Request goes through the mobile carrier's network
  4. Carrier intercepts the request via special header injection
  5. Carrier adds SIM information (MSISDN - the phone number associated with SIM) to the request
  6. Verification service receives:
    - The phone number user claims to have
    - The actual phone number from the SIM (from carrier)
  7. Service compares both and returns match/no-match

  Key technical points:
  - Works via special API endpoints that carriers recognize
  - No SMS needed, happens in 1-2 seconds
  - Carrier injects X-Operator headers or uses mobile data session info
  - Falls back to SMS if user is on WiFi or unsupported carrier

  Integration approach:

  Mobile App (React Native)
      ↓
  Native Module (iOS/Android)
      ↓
  tru.ID SDK
      ↓
  Mobile Data Request → Carrier Network
      ↓
  tru.ID API (receives carrier-injected SIM info)
      ↓
  Response: Match or No-Match

  Requirements:

  - React Native native module wrapper for tru.ID SDK
  - iOS: Swift/Objective-C bridge
  - Android: Kotlin/Java bridge
  - Permissions: Network access
  - Supported carriers (major carriers in US/EU/Asia typically supported)

  ---
  2. Device Binding

  Components to track:

  Device Identifiers:
  - iOS: identifierForVendor (IDFV) - unique per app install
  - Android: ANDROID_ID - unique per device/app combination
  - Alternative: Generate your own UUID on first launch, store in secure storage

  What to store server-side:
  {
    "phoneNumber": "+1234567890",
    "deviceBindings": [
      {
        "deviceId": "ABC123-device-fingerprint",
        "platform": "ios",
        "firstSeen": "2025-11-23T10:00:00Z",
        "lastSeen": "2025-11-23T15:30:00Z",
        "appVersion": "1.2.0",
        "osVersion": "iOS 17.1",
        "model": "iPhone 15 Pro",
        "verificationMethod": "sim-based",
        "trustScore": 95,
        "status": "active"
      }
    ]
  }

  Implementation flow:

  Initial binding:
  1. User verifies phone number via SIM-based auth
  2. App generates/retrieves device fingerprint
  3. Server creates binding: phoneNumber ↔ deviceId
  4. Store in database with timestamp

  Subsequent logins:
  1. Check if deviceId is already bound to this phone number
  2. If yes → Allow without reverification (or use Face ID)
  3. If no → Flag as suspicious, require additional verification

  Security rules:
  - Max 2-3 devices per phone number (configurable)
  - If new device detected → Send push notification to existing devices
  - Require reverification on new device
  - Option to revoke device bindings from account settings

  ---
  3. Behavioral Analytics

  Data points to collect:

  Usage patterns:
  - Login times (unusual 3am login?)
  - Location changes (was in NYC, now in London?)
  - Network info (carrier changes?)
  - App usage patterns
  - Transaction patterns (for financial apps)

  Risk scoring factors:
  Risk Score Calculation:

  Base Score: 100 (trusted)

  Deductions:
  - New device: -30
  - VPN detected: -20
  - Unusual location: -25
  - Different carrier: -15
  - Login at unusual time: -10
  - Rapid device switching: -40
  - Phone number used on >3 devices: -50

  Result:
  - Score > 80: Allow
  - Score 50-80: Require additional verification (SMS, email)
  - Score < 50: Block, manual review

  Implementation approach:

  Client-side collection:
  On app launch/login:
  1. Collect device fingerprint
  2. Collect network info (carrier, IP, VPN detection)
  3. Collect location (if permission granted)
  4. Collect timestamp
  5. Send to backend

  Server-side analysis:
  Backend receives data:
  1. Compare against user's historical patterns
  2. Calculate risk score
  3. Apply rules:
     - Is this a known device?
     - Is location consistent with history?
     - Is timing normal?
     - Has this phone # been used on many devices?
  4. Return decision: allow / challenge / block

  Fraud detection patterns:
  - Same phone number used on 10+ devices → Likely fraud
  - Rapid switching between devices → Suspicious
  - Account takeover indicators → Block and alert

  ---
  4. Complete Flow Example

  First-time verification:

  1. User launches app → Enter phone number
  2. App checks network (mobile data vs WiFi)
  3. If mobile data:
     - Call tru.ID SDK
     - SDK makes network request
     - Carrier verifies SIM matches phone number
     - Result: ✓ Match
  4. If WiFi or match fails:
     - Fallback to SMS verification
     - Mark as "lower trust"
  5. Generate device fingerprint
  6. Send to backend:
     {
       phoneNumber: "+1234567890",
       deviceId: "ABC123",
       verificationMethod: "sim-based",
       deviceInfo: {...}
     }
  7. Backend:
     - Create user/phone record
     - Bind device to phone number
     - Set initial trust score: 100
     - Return auth token
  8. Store token locally
  9. User sets up Face ID/PIN

  Subsequent login (known device):

  1. App launches
  2. Check local storage for auth token
  3. Send to backend: {deviceId: "ABC123", token: "..."}
  4. Backend:
     - Validates token
     - Checks device binding exists
     - Checks risk score
     - Result: Known device, high trust
  5. Return: Allow access
  6. User authenticates with Face ID locally

  Suspicious login (new device):

  1. User installs app on new device
  2. Enter phone number: "+1234567890"
  3. Run SIM verification → ✓ Match
  4. Generate new device fingerprint: "XYZ789"
  5. Send to backend
  6. Backend detects:
     - Phone number already bound to device "ABC123"
     - New device "XYZ789"
     - Risk score: 70 (moderate)
  7. Backend response:
     - Send push notification to device "ABC123":
       "New device trying to access your account. Was this you?"
     - Require additional verification on new device
  8. User on new device:
     - Must also verify email
     - Or approve from trusted device
  9. Once approved:
     - Bind new device to account
     - Allow access

  ---
  5. Technology Stack

  For SIM Verification:

  - tru.ID: React Native SDK available, good docs
  - Twilio Verify: Has Silent Network Auth, good React Native support
  - Sinch Verification: Another option with SDK
  - Custom integration: Directly with carrier APIs (complex, requires partnerships)

  For Device Binding:

  - react-native-device-info: Get device details
  - @react-native-async-storage/async-storage: Store device ID
  - expo-secure-store or react-native-keychain: Secure storage
  - Backend: PostgreSQL/MongoDB to store bindings

  For Behavioral Analytics:

  - Segment or Mixpanel: Event tracking
  - Custom solution: Log events to your backend
  - Fraud detection services: Sift, Forter, Riskified (overkill for most)

  ---
  6. Cost Considerations

  - tru.ID: ~$0.05-0.10 per verification
  - Twilio Verify: ~$0.05 per verification
  - SMS fallback: ~$0.01 per SMS
  - Infrastructure: Your backend costs for storing/processing data

  ---
  7. Limitations & Edge Cases

  Won't work when:
  - User on WiFi (fallback to SMS required)
  - Unsupported carrier
  - User traveling internationally (different carrier)
  - eSIM complications

  Privacy concerns:
  - Must disclose data collection
  - GDPR/CCPA compliance required
  - Users may not want location tracking

  User experience:
  - Must explain why temporarily disabling WiFi
  - Need good error messages
  - Graceful fallbacks

  
⏺ How tru.ID Achieves SIM-Based Verification

  It's based on how mobile carrier networks identify subscribers. Here's the deep technical
  explanation:

  ---
  1. Mobile Network Fundamentals

  Every SIM card has identifiers:

  - IMSI (International Mobile Subscriber Identity): Unique SIM identifier stored on the card
  - MSISDN: The actual phone number associated with the SIM
  - IMEI: Device hardware identifier (separate from SIM)

  When you connect to mobile data:

  1. Your device authenticates with the carrier's network using the SIM
  2. Carrier knows exactly which phone number (MSISDN) is making the data request
  3. All data traffic is routed through carrier infrastructure
  4. Carrier can see and modify requests passing through their network

  ---
  2. The Technical Mechanism

  Traditional approach (what most services use):

  Your App → Internet → tru.ID Server
  (Carrier has no involvement)

  tru.ID's approach:

  Your App → Mobile Data → Carrier Network → tru.ID Server
                           ↑
                     Carrier injects header

  What happens step-by-step:

  Step 1: Special DNS/URL
  - tru.ID has partnerships with mobile carriers
  - They have special API endpoints recognized by carriers
  - Example: verify.tru.id or carrier-specific gateway URLs

  Step 2: Request over mobile data
  // App makes HTTPS request to tru.ID endpoint
  // IMPORTANT: Must be on mobile data, not WiFi

  POST https://eu.api.tru.id/phone_check/v0.1/checks
  Headers: {
    Authorization: "Bearer YOUR_API_KEY"
  }
  Body: {
    phone_number: "+1234567890"
  }

  Step 3: Network routing
  - Request goes through carrier's network infrastructure
  - Carrier has special agreement with tru.ID
  - Carrier's network equipment (GGSN/PGW - internet gateway) intercepts the request

  Step 4: Header injection
  - Carrier inspects the destination (tru.ID endpoint)
  - Carrier adds special HTTP headers to the request:
  X-Operator-Subscriber-ID: <encrypted MSISDN>
  or
  X-MSISDN: <phone number from SIM>
  or
  X-Carrier-Auth-Token: <signed token with subscriber info>

  Step 5: tru.ID receives enriched request
  tru.ID server receives:
  - The phone number the user claims: "+1234567890" (from request body)
  - The actual phone number from carrier: "+1234567890" (from injected header)

  Step 6: Verification
  if (claimedNumber === carrierProvidedNumber) {
    return { match: true, confidence: "high" }
  } else {
    return { match: false }
  }

  ---
  3. The Magic: Carrier Header Enrichment

  This is based on Mobile Network Operator (MNO) APIs and Header Enrichment:

  Technical implementation:

  Carriers use:
  - GGSN (GPRS Gateway Support Node) - 3G/4G
  - PGW (PDN Gateway) - 4G LTE
  - UPF (User Plane Function) - 5G

  These are the gateways between mobile network and internet.

  What they do:
  1. Monitor outbound HTTPS requests
  2. Match requests to specific partner endpoints (tru.ID's URLs)
  3. Look up subscriber info from HLR/HSS (Home Location Register / Home Subscriber Server)
    - This is the carrier's database mapping IMSI → MSISDN
  4. Inject headers with subscriber information
  5. Forward modified request

  Protocol details:

  Uses standards like:
  - Mobile Connect (GSMA standard)
  - CAMARA Network APIs (new industry standard)
  - OAuth 2.0 with operator discovery

  ---
  4. Why It Only Works on Mobile Data

  On Mobile Data:
  App → Cell Tower → Carrier Network → Carrier Gateway (adds headers) → Internet → tru.ID
         └─ SIM auth happens here

  On WiFi:
  App → WiFi Router → ISP → Internet → tru.ID
  (Carrier never sees the request, can't add headers)

  The carrier only controls requests going through their mobile network infrastructure. WiFi bypasses
  the carrier completely.

  ---
  5. Security: How is this secure?

  Encryption and signing:

  - Headers are often encrypted/signed by carrier
  - tru.ID verifies signature using carrier's public key
  - Prevents man-in-the-middle attacks or header spoofing

  Example secure header:

  X-Operator-Token: eyJhbGciOiJSUzI1NiIs...
  (JWT signed by carrier containing MSISDN)

  tru.ID decodes and verifies:
  const decoded = jwt.verify(token, carrierPublicKey)
  // decoded = { msisdn: "+1234567890", timestamp: ..., carrier: "AT&T" }

  ---
  6. Carrier Partnerships

  This only works because:

  Direct integrations:

  - tru.ID has contracts with carriers (AT&T, Verizon, T-Mobile, Vodafone, etc.)
  - Carriers whitelist tru.ID's endpoints in their network equipment
  - Revenue sharing: Carrier gets paid per verification

  Industry standards:

  - GSMA Mobile Connect: Standard protocol for carrier authentication
  - CAMARA: New open-source carrier API standard (Linux Foundation)
  - These allow standardized integration across carriers

  ---
  7. Alternative: Mobile Connect Flow

  Some implementations use OAuth-based flow:

  1. App redirects to carrier's login portal
  2. User authenticates on carrier network (silent if on mobile data)
  3. Carrier confirms phone number matches SIM
  4. Carrier redirects back with authorization code
  5. App exchanges code for user info (including verified phone number)

  This is similar to "Sign in with Google" but with your mobile carrier.

  ---
  8. Why This Isn't Common Knowledge

  Reasons it's not widely used:
  - Requires carrier partnerships (takes years to negotiate)
  - Not all carriers support it
  - Only works on mobile data
  - Costs money per verification
  - Privacy concerns (carriers tracking API usage)

  But it's growing:
  - Banks use it (regulatory pressure to verify identity)
  - Fintech apps (prevent fraud)
  - Government services (strong identity verification)

  ---
  9. Real-World Example

  Let's trace an actual request:

  User on Verizon network opens your app:

  1. App: "Verify +1-555-123-4567"

  2. App makes request:
     POST https://eu.api.tru.id/phone_check/v0.1/checks
     (over mobile data)

  3. Request hits Verizon's PGW

  4. Verizon's PGW:
     - Recognizes tru.ID endpoint
     - Looks up IMSI from data session
     - Queries HLR: IMSI → MSISDN = +1-555-123-4567
     - Adds header: X-MSISDN: +1-555-123-4567
     - Signs with Verizon's private key
     - Forwards to tru.ID

  5. tru.ID server:
     - Verifies Verizon's signature
     - Compares: claimed (+1-555-123-4567) vs carrier (+1-555-123-4567)
     - Match! ✓
     - Returns: { match: true }

  6. Your app: "Phone verified!"

  If user tried to fake it:
  1. User enters: +1-999-888-7777 (someone else's number)
  2. But their SIM has: +1-555-123-4567
  3. Carrier injects: X-MSISDN: +1-555-123-4567
  4. tru.ID compares: +1-999-888-7777 ≠ +1-555-123-4567
  5. Returns: { match: false }

  ---
  10. Fallback When It Doesn't Work

  tru.ID gracefully handles:
  - User on WiFi → Return "no_coverage", app sends SMS
  - Unsupported carrier → Return "no_coverage"
  - Network error → Timeout, fallback to SMS
  - Airplane mode → Obviously fails

  ---
  Summary

  tru.ID works because:
  1. Mobile carriers control all mobile data traffic
  2. Carriers know which phone number (SIM) is making each request
  3. Carriers have partnerships to inject this info into specific API requests
  4. tru.ID receives the verified phone number directly from the carrier
  5. No way to fake it because the carrier is the source of truth

  It's essentially the carrier vouching "This request came from SIM card with phone number X" - and
  that's something only the carrier can know with certainty.

  Pretty clever, right?

> ok. so in the long run, if we had to the same. we will have integrate with each carrier?

⏺ Yes, and it's extremely difficult.

  Here's what you'd need to do:

  ---
  1. Direct Carrier Integration (The Hard Way)

  Requirements for each carrier:

  Business side:
  - Negotiate partnership agreement with each carrier (AT&T, Verizon, T-Mobile, etc.)
  - Legal contracts (can take 6-18 months per carrier)
  - Revenue sharing agreements (carriers want their cut)
  - Compliance with carrier requirements (security audits, certifications)

  Technical side:
  - Each carrier has different APIs and protocols
  - Get whitelisted in their network equipment (GGSN/PGW/UPF)
  - Obtain carrier's signing keys for header verification
  - Build separate integration for each carrier's infrastructure
  - Maintain as carriers upgrade their networks (3G → 4G → 5G)

  Rough timeline:

  - First carrier: 12-24 months
  - Each additional carrier: 6-12 months
  - Ongoing maintenance: Constant

  Costs:

  - Legal fees: $50K-$200K per carrier
  - Technical implementation: $100K-$500K
  - Ongoing maintenance: $50K-$100K/year
  - Carrier fees: Per-verification fees or minimums

  Bottom line: Only viable if you're a massive company (think bank, government, or major tech
  company).

  ---
  2. Use Industry Standards (Slightly Easier)

  Instead of custom integrations, implement standard protocols:

  GSMA Mobile Connect

  - Open standard for carrier authentication
  - Carriers that support it have standardized APIs
  - You still need agreements, but integration is uniform

  How it works:
  1. User enters phone number
  2. Your app detects carrier (MCC/MNC from SIM)
  3. Redirect to carrier's Mobile Connect endpoint
  4. Carrier authenticates user (silent on mobile data)
  5. Carrier returns verified phone number via OAuth

  Pros:
  - One integration works across multiple carriers
  - Less custom work per carrier

  Cons:
  - Still need business agreements with each carrier
  - Not all carriers support it (especially in US)
  - Months/years of negotiations

  ---
  3. CAMARA Network APIs (The Future)

  CAMARA is a new Linux Foundation project:
  - Open-source standard for carrier network APIs
  - Backed by major carriers globally
  - Includes "Number Verification" API

  Vision:
  - Standardized API across all carriers
  - Easier onboarding for developers
  - Pay-as-you-go pricing

  Reality:
  - Still in development (2024-2025 rollout)
  - Not widely available yet
  - Still requires carrier partnerships, just easier

  ---
  4. Practical Alternatives

  Option A: Use a service like tru.ID, Twilio, Sinch

  They've already done the carrier integrations

  Pros:
  - Immediate access to multiple carriers
  - One API, works everywhere
  - They handle carrier relationships
  - ~$0.05-0.10 per verification

  Cons:
  - Ongoing cost per verification
  - Dependency on third party
  - Data flows through their servers

  Cost comparison:
  - DIY: $500K-$2M initial + $100K/year maintenance
  - Using service: $0.10 × 10,000 verifications/month = $1,000/month = $12K/year

  Break-even: You'd need ~42M verifications per year to justify building in-house (at $0.10 per
  verification)

  ---
  Option B: Hybrid approach

  For major markets/carriers:
  - Build direct integration with top 2-3 carriers in your region
  - Covers 80-90% of your users

  For everything else:
  - Use tru.ID/Twilio for long-tail carriers
  - Fallback to SMS

  Makes sense if:
  - You have millions of users
  - Verification cost becomes significant
  - You have regulatory requirements (banking)
  - You have resources for multi-year project

  ---
  Option C: Skip SIM verification entirely

  For most apps, this is overkill.

  Simpler alternatives:
  - SMS verification + VoIP detection service ($0.02/verification)
  - Device fingerprinting + risk scoring
  - Email + SMS dual verification
  - Rate limiting to prevent abuse

  When SIM verification is worth it:
  - Banking/financial apps
  - Healthcare apps with PHI
  - Government/identity services
  - High-value transaction platforms
  - Apps with significant fraud problems

  ---
  5. If You Must Build It Yourself

  Minimum viable approach:

  Start with one carrier:
  1. Pick the dominant carrier in your market
  2. Apply for developer/partner program
  3. Wait 12-24 months for approval
  4. Build integration
  5. Test extensively

  Fallback for everything else:
  - SMS verification
  - Twilio/tru.ID for other carriers

  Technical architecture:

  Your Backend
      ├── Carrier A Integration (direct)
      │   └── Header validation, signature verification
      ├── Carrier B Integration (direct)
      ├── tru.ID/Twilio SDK (for others)
      └── SMS Fallback

  ---
  6. Real-World Example

  WhatsApp:
  - Used SMS verification for years
  - Eventually built direct carrier integrations for cost savings
  - Only after reaching billions of users
  - Took years and massive resources

  Most fintech startups:
  - Use Twilio Verify or similar
  - Switch to direct integration only if they reach massive scale
  - Focus resources on core product first

  ---
  My Recommendation

  For your use case (Face ID + phone verification):

  Phase 1 (Now):

  - SMS verification + basic VoIP detection
  - Good enough for MVP
  - Cost: ~$0.02 per user

  Phase 2 (If needed):

  - Integrate Twilio Verify with Silent Network Auth
  - Better UX, higher security
  - Cost: ~$0.05 per verification

  Phase 3 (Only if massive scale):

  - Consider direct carrier integration
  - Only if doing 10M+ verifications/year
  - Multi-year project

  Don't build SIM verification yourself unless:
  - You have $1M+ budget
  - You have 2+ years timeline
  - You have 10M+ users
  - You have dedicated team for carrier relationships

  Use existing services - they exist for this exact reason.

  Sound reasonable?

> got it. So for VoIP. Google phone numbers can also receive VoIP right?

⏺ Yes, Google Voice numbers are VoIP numbers and work entirely over the internet.

  ---
  How Google Voice Works

  Not tied to any SIM:

  - Google Voice gives you a virtual phone number
  - Receives SMS and calls over internet (VoIP)
  - Can forward to real phone numbers, but the Google Voice number itself is virtual
  - Works on WiFi, mobile data, or any internet connection
  - Can be used on multiple devices simultaneously

  Technical details:

  Traditional phone:
  Phone Number → SIM Card → Device → Carrier Network

  Google Voice:
  Phone Number → Google's servers → Internet → Any device with Google Voice app

  ---
  VoIP Detection

  Services like Twilio Lookup, Numverify can detect:

  Types they identify:
  - ✅ Google Voice
  - ✅ Skype numbers
  - ✅ TextNow, TextFree, TextMe
  - ✅ Burner apps
  - ✅ VoIP.ms, Vonage
  - ✅ WhatsApp Business numbers
  - ✅ Most VoIP providers

  How they detect:
  - Maintain databases of number ranges assigned to VoIP providers
  - Check with carrier databases (HLR lookups)
  - Pattern recognition
  - Real-time carrier queries

  Example API response:

  // Twilio Lookup API
  {
    "phone_number": "+15551234567",
    "carrier": {
      "name": "Google (Grand Central) BWI - Bandwidth.com - SVR",
      "type": "voip",  // ← Key indicator
      "mobile_country_code": "310",
      "mobile_network_code": "004"
    }
  }

  // Real mobile number for comparison
  {
    "phone_number": "+15559876543",
    "carrier": {
      "name": "Verizon Wireless",
      "type": "mobile",  // ← Real carrier
      "mobile_country_code": "310",
      "mobile_network_code": "012"
    }
  }

  ---
  Other VoIP Numbers to Watch For

  Common ones users might try:

  Free services:
  - Google Voice (US/Canada)
  - TextNow
  - TextFree
  - Dingtone
  - TextMe
  - WhatsApp (for business numbers)

  Burner/temporary:
  - Burner app
  - Hushed
  - Sideline
  - Line2

  Business VoIP:
  - RingCentral
  - Grasshopper
  - 8x8
  - Vonage

  International:
  - Skype
  - Viber
  - WeChat (some numbers)

  ---
  Detection Reliability

  High accuracy for:

  - Google Voice (well-known number ranges)
  - Major VoIP providers
  - US/Canada numbers

  Lower accuracy for:

  - International VoIP services
  - Newer/smaller providers
  - Some carrier-integrated VoIP services

  Can't detect:

  - Call forwarding (real number that forwards to VoIP)
  - Dual SIM setups
  - eSIM (these are real SIM-based)

  ---
  Security Implications

  Why VoIP matters for verification:

  Problem scenarios:
  1. Fraudster creates 100 Google Voice numbers
  2. Uses them to create 100 accounts in your app
  3. All from the same device

  Or:

  1. User's real phone number: +1-555-1111
  2. Creates Google Voice number: +1-555-2222
  3. Verifies account with Google Voice number
  4. Claims device was "stolen"
  5. You can't reach them or verify device ownership

  What to do:

  Option 1: Block VoIP entirely
  const carrier = await lookupPhoneNumber(phoneNumber)
  if (carrier.type === 'voip') {
    throw new Error('VoIP numbers not allowed. Please use a mobile number.')
  }

  Pros: Maximum security
  Cons: Blocks legitimate users (some people only have Google Voice)

  ---
  Option 2: Allow but flag
  const carrier = await lookupPhoneNumber(phoneNumber)
  if (carrier.type === 'voip') {
    user.riskScore -= 30
    user.requiresAdditionalVerification = true
    // Require email verification too
    // Monitor account more closely
  }

  Pros: Doesn't block real users, but adds safeguards
  Cons: More complex logic

  ---
  Option 3: Tiered approach
  const carrier = await lookupPhoneNumber(phoneNumber)

  if (carrier.type === 'voip') {
    // Allow for basic features
    user.canBrowse = true
    user.canComment = true

    // Block for sensitive features
    user.canTransferMoney = false
    user.canDeleteAccount = false
    user.canChangeEmail = false

    // Show prompt: "Verify a mobile number to unlock all features"
  }

  Pros: Best UX, still secure
  Cons: Complex to implement

  ---
  Real-World Patterns

  What major apps do:

  Banking apps (Venmo, Cash App, etc.):
  - Block VoIP numbers entirely
  - Require real mobile number

  Social media (Instagram, Facebook):
  - Allow VoIP
  - But flag for fraud monitoring
  - May require additional verification (email, ID upload)

  Messaging (WhatsApp, Signal):
  - Allow VoIP
  - But limit features (can't create business accounts)

  Ride-sharing (Uber, Lyft):
  - Block VoIP for drivers
  - Allow for riders (lower risk)

  ---
  Implementation Example

  async function verifyPhoneNumber(phoneNumber) {
    // Step 1: Check if VoIP
    const lookup = await twilioClient.lookups.v1
      .phoneNumbers(phoneNumber)
      .fetch({ type: ['carrier'] })

    const isVoIP = lookup.carrier.type === 'voip'
    const isGoogleVoice = lookup.carrier.name.includes('Google') ||
                          lookup.carrier.name.includes('Bandwidth')

    // Step 2: Apply policy
    if (isVoIP) {
      return {
        allowed: false, // or true with conditions
        reason: 'VoIP numbers are not supported',
        carrierType: 'voip',
        provider: lookup.carrier.name,
        requiresAdditionalVerification: true
      }
    }

    // Step 3: Send SMS verification
    await sendSMS(phoneNumber, verificationCode)

    return {
      allowed: true,
      carrierType: 'mobile',
      carrier: lookup.carrier.name
    }
  }

  ---
  Cost Note

  Carrier lookup pricing:
  - Twilio Lookup: $0.005 per lookup
  - Numverify: ~$0.001-$0.01 per lookup
  - Combined with SMS: $0.005 + $0.0075 = ~$0.0125 total

  Still way cheaper than building your own system!

  ---
  Recommendation for Your App

  Given your Face ID + phone verification feature:

  I'd suggest:
  1. Use VoIP detection (Twilio Lookup or similar)
  2. Allow VoIP but require additional verification:
    - Email verification mandatory
    - Device binding
    - Monitor for abuse
  3. Display warning: "VoIP number detected. For security, please also verify your email."
  4. Track metrics: If VoIP users cause problems, tighten policy later