# TODO - PZero Verifier

## High Priority

- [ ] Implement actual Bluetooth communication (currently placeholder)
  - Replace mock bluetooth service with real implementation
  - Test connection stability with mobile app
  - Handle connection/disconnection events

- [ ] Add endpoint registration system
  - UI for adding/removing protected endpoints
  - Persistent storage of registered endpoints
  - Validation and testing of endpoint patterns

## Core Features

- [ ] Integrate Centrifugo for real-time messaging
  - Set up Centrifugo client in Tauri backend
  - Implement message handlers
  - Add reconnection logic

- [ ] Integrate OpenZiti for secure networking
  - Research OpenZiti integration with Tauri
  - Implement secure tunnel for endpoint proxying
  - Test end-to-end security

- [ ] Add request history/logging
  - Design database schema for request logs
  - Implement logging service
  - Create UI for viewing request history
  - Add filtering and search capabilities

## UI/UX Improvements

- [ ] Add settings/configuration UI
  - General settings page
  - Bluetooth settings
  - Endpoint management
  - Notification preferences
  - Auto-start configuration

- [ ] Add notification system for background authorization
  - Native OS notifications
  - Custom notification UI
  - Sound/vibration options
  - Notification history

## System Integration

- [ ] Add auto-start on system boot
  - macOS: Launch agent configuration
  - Windows: Registry/startup folder
  - Linux: systemd service

- [ ] System tray enhancements
  - Add quick actions to tray menu
  - Show connection status in tray
  - Add recent requests submenu

## Security & Reliability

- [ ] Implement request timeout handling
- [ ] Add rate limiting for authorization requests
- [ ] Implement secure storage for sensitive data
- [ ] Add audit logging
- [ ] Implement automatic reconnection logic
- [ ] Add error reporting and crash analytics

## Testing

- [ ] Unit tests for Rust backend
- [ ] Unit tests for React frontend
- [ ] Integration tests for Bluetooth communication
- [ ] E2E tests for authorization flow
- [ ] Performance testing under load

## Documentation

- [ ] API documentation for Tauri commands
- [ ] User guide for setup and configuration
- [ ] Developer guide for contributing
- [ ] Architecture decision records (ADRs)

## Future Enhancements

- [ ] Multi-device support (connect to multiple mobile devices)
- [ ] Biometric authentication support
- [ ] Custom authorization policies
- [ ] Analytics dashboard
- [ ] Export/import configuration
- [ ] Dark/light theme toggle
- [ ] Internationalization (i18n)
