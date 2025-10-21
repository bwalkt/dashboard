# App Icons

This directory contains the source app icons for all platforms. Icons are copied to the respective platform directories using the `copy-icons` script in each package.

## Directory Structure

- `ios/` - iOS app icons (for @pzero/mobile)
- `android/` - Android app icons (for @pzero/mobile)
- `tauri/` - Desktop app icons (for @pzero/verifier)

## Usage

### Mobile Package
Run the copy script to update iOS and Android icons:
```bash
cd packages/mobile
pnpm copy-icons
```

### Verifier Package
Run the copy script to update Tauri desktop icons:
```bash
cd packages/verifier
pnpm copy-icons
```

## Required Icons

### iOS (`ios/`)
- AppIcon-20x20@2x.png
- AppIcon-20x20@3x.png
- AppIcon-29x29@2x.png
- AppIcon-29x29@3x.png
- AppIcon-40x40@2x.png
- AppIcon-40x40@3x.png
- AppIcon-60x60@2x.png
- AppIcon-60x60@3x.png
- AppIcon-1024x1024.png

### Android (`android/`)
- ic_launcher.png (used for all densities)
- ic_launcher_round.png (used for all densities)

### Tauri (`tauri/`)
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.png
- icon.icns (macOS)
- icon.ico (Windows)
- Square*.png (Windows Store logos)
- StoreLogo.png
