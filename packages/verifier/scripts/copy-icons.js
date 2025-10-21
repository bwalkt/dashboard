#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const SHARED_ICONS_DIR = path.join(__dirname, '../../shared/src/assets/icons')
const TAURI_ICONS_DIR = path.join(__dirname, '../src-tauri/icons')

// Tauri icon definitions
const tauriIcons = [
  { src: '32x32.png', dest: '32x32.png' },
  { src: '128x128.png', dest: '128x128.png' },
  { src: '128x128@2x.png', dest: '128x128@2x.png' },
  { src: 'icon.png', dest: 'icon.png' },
  { src: 'icon.icns', dest: 'icon.icns' },
  { src: 'icon.ico', dest: 'icon.ico' },
  { src: 'Square107x107Logo.png', dest: 'Square107x107Logo.png' },
  { src: 'Square142x142Logo.png', dest: 'Square142x142Logo.png' },
  { src: 'Square150x150Logo.png', dest: 'Square150x150Logo.png' },
  { src: 'Square284x284Logo.png', dest: 'Square284x284Logo.png' },
  { src: 'Square30x30Logo.png', dest: 'Square30x30Logo.png' },
  { src: 'Square310x310Logo.png', dest: 'Square310x310Logo.png' },
  { src: 'Square44x44Logo.png', dest: 'Square44x44Logo.png' },
  { src: 'Square71x71Logo.png', dest: 'Square71x71Logo.png' },
  { src: 'Square89x89Logo.png', dest: 'Square89x89Logo.png' },
  { src: 'StoreLogo.png', dest: 'StoreLogo.png' },
]

/**
 * Ensure the destination directory exists and copy a file from `src` to `dest`.
 *
 * If parent directories of `dest` do not exist they will be created. If an error
 * occurs while creating directories or copying the file, the error message is
 * logged to stderr.
 *
 * @param {string} src - Path to the source file to copy.
 * @param {string} dest - Destination path for the copied file; parent directories will be created if missing.
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
 * Copy the predefined Tauri icon files from the shared assets directory into the project's Tauri icons directory.
 *
 * Iterates over the `tauriIcons` list, copies each source file that exists to its destination using `copyIcon`, skips missing sources while logging a warning, and prints start/completion messages.
 */
function main() {
  console.log('🖥️  Copying app icons from shared assets...\n')

  console.log('Tauri Icons:')
  tauriIcons.forEach(({ src, dest }) => {
    const srcPath = path.join(SHARED_ICONS_DIR, 'tauri', src)
    const destPath = path.join(TAURI_ICONS_DIR, dest)
    if (fs.existsSync(srcPath)) {
      copyIcon(srcPath, destPath)
    } else {
      console.warn(`⚠ Source file not found: ${srcPath}`)
    }
  })

  console.log('\n✅ Icon copy complete!')
}

main()