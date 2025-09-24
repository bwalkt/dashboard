# Tauri iOS Build Troubleshooting Guide

This document outlines the steps taken to resolve iOS build errors for the Salesforce Dashboard Tauri application.

## Initial Problem

When running `bun tauri:ios "iPhone\ 17"`, the build was failing with the following error:

```
PhaseScriptExecution Build\ Rust\ Code ... (exit status: 1)
** BUILD FAILED **
```

## Root Causes Identified

1. **Missing iOS Configuration**: The `tauri.conf.json` file lacked iOS-specific bundle configuration
2. **Missing iOS Rust Toolchains**: Required Rust targets for iOS compilation were not installed
3. **Missing iOS Project Initialization**: The iOS Xcode project had not been generated
4. **Path Mismatch Issues**: Build cache contained references to incorrect paths

## Solutions Implemented

### 1. Added iOS Configuration to tauri.conf.json

**Problem**: The Tauri configuration was missing iOS-specific settings, causing code signing issues.

**Solution**: Added iOS bundle configuration to `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"],
    "iOS": {
      "developmentTeam": "FAKETEAMID"
    }
  }
}
```

**Note**: Initially tried to add `provisioningProfile: "development"` but this property is not allowed in the iOS configuration schema.

### 2. Installed Required iOS Rust Toolchains

**Problem**: Missing Rust targets for iOS cross-compilation.

**Solution**: Installed the required Rust targets:

```bash
# Install iOS simulator target
rustup target add aarch64-apple-ios-sim

# Install iOS device target
rustup target add aarch64-apple-ios

# Install x86_64 iOS target (installed during init)
rustup target add x86_64-apple-ios
```

### 3. Initialized iOS Project

**Problem**: The iOS Xcode project directory didn't exist, causing the error:

```
Xcode project directory .../src-tauri/gen/apple doesn't exist. Please run `tauri ios init` and try again.
```

**Solution**: Ran the iOS initialization command:

```bash
bunx tauri ios init
```

This command:

- Installed missing iOS Rust targets
- Updated xcodegen to the latest version
- Generated the Xcode project files
- Created the necessary iOS project structure

### 4. Cleaned Build Cache

**Problem**: Build cache contained references to incorrect paths, causing permission file lookup errors:

```
failed to read file '/Users/jaspreetsingh/Projects/Upwork/dashboard/src-tauri/target/...': No such file or directory
```

**Solution**: Cleaned the Rust build cache:

```bash
cd src-tauri
cargo clean
```

Also removed the generated iOS project directory to force regeneration:

```bash
rm -rf src-tauri/gen
```

## Final Working Command

After implementing all fixes, the iOS build command works successfully:

```bash
bun tauri:ios "iPhone\ 17"
```

## Key Learnings

1. **iOS Project Initialization**: Always run `tauri ios init` before attempting iOS builds
2. **Rust Toolchains**: Ensure all required iOS Rust targets are installed
3. **Configuration Schema**: Follow the exact Tauri configuration schema - not all properties are allowed
4. **Build Cache**: Clean build cache when encountering path-related errors
5. **Development Team**: Use `FAKETEAMID` as a placeholder for development builds

## Environment Information

- **OS**: macOS 26.0.0 arm64
- **Xcode**: 26.0.1
- **Rust**: 1.90.0
- **Tauri**: 2.8.5
- **Node**: 22.13.0
- **Bun**: 1.1.26

## Additional Notes

- The build uses a fake development team ID (`FAKETEAMID`) for simulator builds
- For production builds, you'll need to set up proper Apple Developer certificates
- The iOS simulator target (`aarch64-apple-ios-sim`) is used for iPhone 17 simulator
- The build process automatically handles code signing for simulator builds

## Troubleshooting Commands

If you encounter similar issues in the future:

1. **Check Tauri info**: `bunx tauri info`
2. **Clean build cache**: `cd src-tauri && cargo clean`
3. **Remove generated files**: `rm -rf src-tauri/gen`
4. **Reinitialize iOS project**: `bunx tauri ios init`
5. **Check Rust targets**: `rustup target list --installed`
6. **Verify configuration**: Check `tauri.conf.json` syntax
