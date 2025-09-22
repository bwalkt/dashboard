# Supabase Auth Integration with Tauri iOS App

This document describes the implementation of Supabase authentication with GitHub OAuth in a Tauri iOS app using deep links.

## Overview

The integration allows users to authenticate with GitHub through Supabase in the Tauri iOS app using a deep link flow. When a user clicks "Sign in with GitHub", the app opens Safari, the user authenticates with GitHub, and then gets redirected back to the app via a custom URL scheme.

## Architecture

### Components

1. **Rust Backend** (`src-tauri/src/lib.rs`)

   - `sign_in_with_github()`: Initiates OAuth flow and opens browser
   - `handle_auth_callback()`: Processes the callback URL and exchanges tokens

2. **iOS Native Code**

   - `AppDelegate.swift`: Handles app lifecycle and deep link routing
   - `DeepLinkHandler.swift`: Processes incoming deep links
   - `TauriBridge.swift`: Bridges iOS native code with Tauri

3. **Frontend**
   - `useTauriAuth.tsx`: React hook for Tauri-specific auth flow
   - Updated GitHub auth button to use Tauri flow when running in Tauri

## Configuration

### Tauri Configuration (`tauri.conf.json`)

```json
{
  "ios": {
    "urlSchemes": [
      {
        "scheme": "com.salesforce-dashboard.app"
      }
    ]
  }
}
```

### iOS Info.plist

Added URL scheme configuration:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.salesforce-dashboard.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.salesforce-dashboard.app</string>
    </array>
  </dict>
</array>
```

### Supabase Configuration

The redirect URI is set to: `com.salesforce-dashboard.app://auth/callback`

## Flow

1. User clicks "Sign in with GitHub"
2. App calls `sign_in_with_github()` Rust command
3. Rust command constructs Supabase OAuth URL with custom redirect URI
4. App opens Safari with the OAuth URL
5. User authenticates with GitHub in Safari
6. GitHub redirects to Supabase
7. Supabase redirects to `com.salesforce-dashboard.app://auth/callback#access_token=...`
8. iOS opens the app via the custom URL scheme
9. `AppDelegate` receives the deep link and calls `DeepLinkHandler`
10. `DeepLinkHandler` emits the URL to Tauri via `TauriBridge`
11. Frontend receives the deep link event and calls `handle_auth_callback()`
12. Rust command processes the callback and exchanges tokens with Supabase
13. Frontend sets the session in Supabase client

## Environment Variables

Make sure these environment variables are set in your Tauri app:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Supabase Dashboard Configuration

In your Supabase dashboard, add the following redirect URL:

```
com.salesforce-dashboard.app://auth/callback
```

## Testing

1. Build and run the iOS app
2. Click "Sign in with GitHub"
3. Complete authentication in Safari
4. Verify the app receives the callback and user is authenticated

## Troubleshooting

### Deep Link Not Working

- Verify URL scheme is correctly configured in `Info.plist`
- Check that the redirect URI matches exactly in Supabase dashboard
- Ensure the app is properly signed and provisioned

### Authentication Fails

- Check environment variables are set correctly
- Verify Supabase project configuration
- Check network connectivity

### iOS Simulator Issues

- Deep links may not work properly in iOS Simulator
- Test on a physical device for best results

## Files Modified/Created

### New Files

- `src/hooks/use-tauri-auth.tsx`
- `src-tauri/gen/apple/Sources/salesforce-dashboard/AppDelegate.swift`
- `src-tauri/gen/apple/Sources/salesforce-dashboard/DeepLinkHandler.swift`
- `src-tauri/gen/apple/Sources/salesforce-dashboard/TauriBridge.swift`

### Modified Files

- `src-tauri/Cargo.toml` - Added dependencies
- `src-tauri/tauri.conf.json` - Added iOS URL scheme configuration
- `src-tauri/src/lib.rs` - Added auth commands
- `src-tauri/gen/apple/salesforce-dashboard_iOS/Info.plist` - Added URL scheme
- `src/lib/supabase.ts` - Updated redirect URI logic
- `src/features/auth/components/github-auth-button.tsx` - Added Tauri support

## Dependencies Added

### Rust Dependencies

- `tauri-plugin-shell` - For opening URLs on iOS
- `tokio` - Async runtime
- `reqwest` - HTTP client for Supabase API calls
- `url` - URL parsing
- `urlencoding` - URL encoding

## Next Steps

1. Test the integration on a physical iOS device
2. Add error handling and user feedback
3. Consider adding other OAuth providers (Google, etc.)
4. Implement token refresh logic
5. Add logout functionality

