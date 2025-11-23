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
