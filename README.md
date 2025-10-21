# PZero Monorepo

A modern monorepo architecture for building cross-platform applications with React Native, React, and Node.js.

## 📦 Packages

This monorepo contains the following packages:

### `@pzero/mobile`
React Native mobile application with features including:
- Navigation (bottom tabs, drawer, native stack)
- Biometric authentication
- BLE connectivity
- QR code support
- Device information and geolocation
- State management with Zustand
- UI components from React Native UI Lib

### `@pzero/sfdc-server-vanilla`
Node.js backend server built with:
- Fastify web framework
- SQLite database with Better-SQLite3
- JWT authentication
- OAuth2 support
- CORS enabled
- TypeScript with ESM modules

### `@pzero/sfdc`
Salesforce-integrated dashboard application featuring:
- React 19 with Vite
- Tauri for desktop/mobile builds
- Radix UI components with Tailwind CSS
- React Router for navigation
- React Query for data fetching
- React Hook Form with Zod validation
- Dark mode support
- Drag and drop functionality
- Data visualization with Recharts

### `@pzero/shared`
Shared utilities and types used across all packages:
- TypeScript type definitions
- Zod schemas for validation
- Common utilities
- Cross-package shared logic

## 🚀 Getting Started

### Prerequisites
- Node.js >= 22
- pnpm >= 9.0.0
- iOS/Android development environment (for mobile)
- Rust (for Tauri desktop builds)

### Installation

```bash
# Install dependencies
pnpm install
```

## 📋 Available Scripts

### Root Level Commands

```bash
# Development
pnpm dev:mobile      # Start React Native mobile app
pnpm dev:server      # Start backend server
pnpm dev:dashboard   # Start Salesforce dashboard

# Building
pnpm build          # Build all packages
pnpm build:mobile   # Build mobile app
pnpm build:server   # Build server
pnpm build:dashboard # Build dashboard
pnpm build:shared   # Build shared package

# Mobile Platform Specific
pnpm ios           # Run iOS app
pnpm android       # Run Android app

# Quality
pnpm lint          # Lint all packages
pnpm test          # Run tests in all packages
```

### Package-Specific Commands

#### Mobile (`packages/mobile`)
```bash
pnpm --filter @pzero/mobile start    # Start Metro bundler
pnpm --filter @pzero/mobile ios      # Run on iOS
pnpm --filter @pzero/mobile android  # Run on Android
pnpm --filter @pzero/mobile lint     # Lint mobile code
pnpm --filter @pzero/mobile test     # Run mobile tests
```

#### Server (`packages/sfdc-server-vanilla`)
```bash
pnpm --filter @pzero/sfdc-server-vanilla dev      # Development mode with watch
pnpm --filter @pzero/sfdc-server-vanilla build    # Build TypeScript
pnpm --filter @pzero/sfdc-server-vanilla start    # Production server
pnpm --filter @pzero/sfdc-server-vanilla gen      # Seed database
```

#### Dashboard (`packages/sfdc`)
```bash
pnpm --filter @pzero/sfdc dev        # Development server
pnpm --filter @pzero/sfdc build      # Production build
pnpm --filter @pzero/sfdc preview    # Preview production build
pnpm --filter @pzero/sfdc tauri:dev  # Tauri desktop development
pnpm --filter @pzero/sfdc tauri:build # Build desktop app
```

#### Shared (`packages/shared`)
```bash
pnpm --filter @pzero/shared build    # Build TypeScript
pnpm --filter @pzero/shared test     # Run tests
pnpm --filter @pzero/shared test:ui  # Run tests with UI
```

## 🏗️ Architecture

This monorepo uses:
- **pnpm workspaces** for dependency management
- **TypeScript** across all packages
- **Shared package** for cross-project code reuse
- **Modern tooling** including Vite, ESBuild, and SWC

## 🔧 Development Workflow

1. **Make changes** in relevant package(s)
2. **Build shared package** if types/utilities changed: `pnpm build:shared`
3. **Run development server** for the package you're working on
4. **Test your changes** using package-specific test commands
5. **Lint your code** before committing: `pnpm lint`

## 📱 Mobile Development

### iOS Setup
```bash
cd packages/mobile/ios
pod install
cd ../../..
pnpm ios
```

### Android Setup
```bash
pnpm android
```

## 🖥️ Desktop Development (Tauri)

```bash
# Development
pnpm --filter @pzero/sfdc tauri:dev

# Build for current platform
pnpm --filter @pzero/sfdc tauri:build
```

## 🧪 Testing

Each package has its own test suite:
```bash
# Run all tests
pnpm test

# Package-specific tests
pnpm --filter @pzero/mobile test
pnpm --filter @pzero/shared test
```

## 📝 Code Quality

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Husky** for Git hooks (in dashboard)
- **Lint-staged** for pre-commit checks

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

ISC