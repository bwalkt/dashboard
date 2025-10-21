# PZero Verifier

A system tray application built with Tauri and React that provides secure authorization for endpoint access via Bluetooth communication with the PZero mobile app.

## Overview

PZero Verifier runs as a background service (similar to Docker Desktop or Google Drive) and intercepts requests to registered endpoints. When a request is made to a protected endpoint, the verifier:

1. Sends an authorization request to the connected mobile device via Bluetooth
2. Shows a notification/popup on the mobile app
3. Waits for user approval or denial
4. Forwards the request to the actual endpoint only if approved

## Architecture

- **Frontend**: React 19 + TypeScript + shadcn/ui + Tailwind CSS
- **Backend**: Tauri 2 (Rust)
- **Communication**: Bluetooth (with PZero mobile app)
- **Future**: Centrifugo + OpenZiti for server communication (TBD)

## Theme

The UI matches the PZero mobile app theme:
- Primary Color: `#80eeff` (cyan)
- Secondary Color: `#bff7ff` (light cyan)
- Dark background: `#2f2f2f`
- Light text: `#f6f6f6`

## Features

- System tray icon with menu
- Real-time authorization prompts
- Bluetooth connectivity with mobile app
- Clean, modern UI matching mobile app design
- Background service operation

## Development

### Prerequisites

- Node.js 20+
- Rust (latest stable)
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Project Structure

```
packages/verifier/
├── src/                      # React frontend
│   ├── components/          # UI components
│   │   ├── ui/             # shadcn components
│   │   └── AuthorizationPrompt.tsx
│   ├── services/           # Business logic
│   │   └── bluetooth.ts    # Bluetooth communication
│   ├── types/              # TypeScript types
│   ├── lib/                # Utilities
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Main Tauri logic
│   │   └── main.rs         # Entry point
│   ├── Cargo.toml
│   └── tauri.conf.json     # Tauri configuration
└── package.json
```

## How It Works

### Authorization Flow

1. **Endpoint Request**: A browser or desktop app makes a request to a registered endpoint
2. **Intercept**: The verifier intercepts the request
3. **Bluetooth Request**: Sends authorization request to mobile app via Bluetooth
4. **User Decision**: Mobile app prompts user to approve/deny
5. **Response**: Verifier receives response via Bluetooth
6. **Forward/Deny**: Request is forwarded to endpoint if approved, otherwise denied

### System Tray

- **Left Click**: Show/focus the window
- **Menu Options**:
  - Show Window
  - Quit

## TODO

- [ ] Implement actual Bluetooth communication (currently placeholder)
- [ ] Add endpoint registration system
- [ ] Integrate Centrifugo for real-time messaging
- [ ] Integrate OpenZiti for secure networking
- [ ] Add request history/logging
- [ ] Add settings/configuration UI
- [ ] Add auto-start on system boot
- [ ] Add notification system for background authorization

## Tauri Commands

### `request_authorization`
Requests authorization from the mobile app for a specific endpoint.

**Parameters**:
- `endpoint: String` - The endpoint URL
- `method: String` - HTTP method (GET, POST, etc.)

**Returns**: `bool` - Whether the request was sent successfully

### `handle_auth_response`
Handles the authorization response from the user.

**Parameters**:
- `request_id: String` - The request ID
- `approved: bool` - Whether the request was approved

## License

Private - PZero Project
