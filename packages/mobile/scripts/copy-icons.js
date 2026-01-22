#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const SHARED_ICONS_DIR = path.join(__dirname, '../../shared/src/assets/icons')
const IOS_ICONS_DIR = path.join(__dirname, '../ios/pzero/Images.xcassets/AppIcon.appiconset')
const ANDROID_RES_DIR = path.join(__dirname, '../android/app/src/main/res')

// iOS icon definitions
const iosIcons = [
  { src: 'AppIcon-20x20@2x.png', dest: 'AppIcon-20x20@2x.png' },
  { src: 'AppIcon-20x20@3x.png', dest: 'AppIcon-20x20@3x.png' },
  { src: 'AppIcon-29x29@2x.png', dest: 'AppIcon-29x29@2x.png' },
  { src: 'AppIcon-29x29@3x.png', dest: 'AppIcon-29x29@3x.png' },
  { src: 'AppIcon-40x40@2x.png', dest: 'AppIcon-40x40@2x.png' },
  { src: 'AppIcon-40x40@3x.png', dest: 'AppIcon-40x40@3x.png' },
  { src: 'AppIcon-60x60@2x.png', dest: 'AppIcon-60x60@2x.png' },
  { src: 'AppIcon-60x60@3x.png', dest: 'AppIcon-60x60@3x.png' },
  { src: 'AppIcon-1024x1024.png', dest: 'AppIcon-1024x1024.png' },
]

// Android icon definitions
const androidIcons = [
  { src: 'ic_launcher.png', dest: 'mipmap-mdpi/ic_launcher.png' },
  { src: 'ic_launcher_round.png', dest: 'mipmap-mdpi/ic_launcher_round.png' },
  { src: 'ic_launcher.png', dest: 'mipmap-hdpi/ic_launcher.png' },
  { src: 'ic_launcher_round.png', dest: 'mipmap-hdpi/ic_launcher_round.png' },
  { src: 'ic_launcher.png', dest: 'mipmap-xhdpi/ic_launcher.png' },
  { src: 'ic_launcher_round.png', dest: 'mipmap-xhdpi/ic_launcher_round.png' },
  { src: 'ic_launcher.png', dest: 'mipmap-xxhdpi/ic_launcher.png' },
  { src: 'ic_launcher_round.png', dest: 'mipmap-xxhdpi/ic_launcher_round.png' },
  { src: 'ic_launcher.png', dest: 'mipmap-xxxhdpi/ic_launcher.png' },
  { src: 'ic_launcher_round.png', dest: 'mipmap-xxxhdpi/ic_launcher_round.png' },
]

/**
 * Copy a file to the given destination, creating the destination directory if necessary.
 * @param {string} src - Path to the source file to copy.
 * @param {string} dest - Destination file path (including filename).
 */
function copyIcon(src, dest) {
  try {
    const destDir = path.dirname(dest)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    fs.copyFileSync(src, dest)
    console.log(`✓ Copied ${path.basename(src)} -> ${dest}`)
  } catch (error) {
    console.error(`✗ Error copying ${src} -> ${dest}:`, error.message)
  }
}

/**
 * Copy app icon files from the shared assets into the platform-specific iOS and Android directories.
 *
 * Iterates the configured iOS and Android icon mappings, copies each existing source file to its destination,
 * and logs progress. If a source file is missing the function logs a warning for that file.
 */
function main() {
  console.log('📱 Copying app icons from shared assets...\n')

  // Copy iOS icons
  console.log('iOS Icons:')
  iosIcons.forEach(({ src, dest }) => {
    const srcPath = path.join(SHARED_ICONS_DIR, 'ios', src)
    const destPath = path.join(IOS_ICONS_DIR, dest)
    if (fs.existsSync(srcPath)) {
      copyIcon(srcPath, destPath)
    } else {
      console.warn(`⚠ Source file not found: ${srcPath}`)
    }
  })

  console.log('\nAndroid Icons:')
  // Copy Android icons
  androidIcons.forEach(({ src, dest }) => {
    const srcPath = path.join(SHARED_ICONS_DIR, 'android', src)
    const destPath = path.join(ANDROID_RES_DIR, dest)
    if (fs.existsSync(srcPath)) {
      copyIcon(srcPath, destPath)
    } else {
      console.warn(`⚠ Source file not found: ${srcPath}`)
    }
  })

  console.log('\n✅ Icon copy complete!')
}

main()
