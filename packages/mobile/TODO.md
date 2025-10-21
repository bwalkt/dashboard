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
