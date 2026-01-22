security find-identity -v -p codesigning
TODO:

types and integrate with server
https://github.com/garg-lucifer/react-native-simcard-info


⏺ The archive for build #13 is now open in Xcode Organizer. You can distribute it to
   TestFlight by:

  1. Click "Distribute App"
  2. Select "App Store Connect"
  3. Select "Upload"
  4. Follow the prompts to upload

  For future automated uploads, we can configure your Apple ID for fastlane. To set
  this up, you'll need to either:

  A) Use App Store Connect API Key (recommended, no 2FA prompts):
  - Have the Account Holder create an API key in App Store Connect
  - Download the .p8 file
  - Configure it in fastlane (we discussed this earlier - waiting for access)

  B) Use Apple ID with App-Specific Password (simpler setup):
  - Set your Apple ID in the Appfile
  - Create an app-specific password at appleid.apple.com
  - Store it in keychain

  Build #13 is ready to upload with:
  - Version: 1.0
  - Build: 13
  - Bundle ID: com.boardwalktech.pzero
  - All privacy descriptions included
  - App icons fixed (no alpha channel)
  - Signed with App Store distribution certificate


s, app icons, bundle ID, signing)

  Next steps when you get the .p8 file:
  1. Place the .p8 file in a secure location (e.g.,
  ~/.appstoreconnect/private_keys/)
  2. Update the Appfile with:
    - Key ID
    - Issuer ID
    - Path to .p8 file
  3. Then fastlane beta will build and upload automatically without any prompts


IDlayr verifies mobile phone numbers using a method called Silent Network Authentication (SNA), which creates a data session to the user's mobile device and checks if the phone number associated with that session matches the number the user provided. This process happens automatically in the background without requiring the user to enter any codes, making it a "hard" verification by confirming the user has possession of the active SIM card for that number. 
How IDlayr's hard verification works
Initiation: A user enters their mobile number into an app or website.
API Call: The mobile number is sent to IDlayr via an API.
Network Connection: IDlayr connects to the mobile network operator (MNO) through a secure, encrypted connection.
Data Session: A unique data session is created on the user's device.
Real-time Check: IDlayr matches the phone number provided by the user with the phone number the MNO identifies as being connected to the data session.
Binary Response: This process results in a simple "Yes" or "No" answer, confirming that the right mobile number is on a real SIM card at that moment.
Verification: If the numbers match, the user is authenticated. This confirms they have possession of the SIM card associated with the number, even if they are on WiFi (IDlayr handles this by routing the check over the mobile data connection). 
https://www.google.com/search?q=how+does+whatsapp+verify+that+the+phone+number+is+associated+with+the+device&oq=how+does+whatsapp+verify+that+the+phone+number+is+associated+with+the+device&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCTIwNDA4ajBqNKgCAbACAfEFQ4IGMEUxD-PxBUOCBjBFMQ_j&sourceid=chrome&ie=UTF-8