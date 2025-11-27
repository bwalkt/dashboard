#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function validateWorkingDirectory() {
  const iosDir = path.join(process.cwd(), 'ios')
  const packagePath = path.join(process.cwd(), 'package.json')

  if (!fs.existsSync(iosDir) || !fs.existsSync(packagePath)) {
    console.error('❌ This script must be run from packages/mobile/ directory')
    console.error('   Current directory:', process.cwd())
    process.exit(1)
  }
}

function getCurrentBuildNumber() {
  try {
    const iosDir = path.join(__dirname, '..', 'ios')
    const buildNumberStr = execSync('agvtool what-version -terse', {
      encoding: 'utf8',
      cwd: iosDir,
    }).trim()
    const buildNumber = Number.parseInt(buildNumberStr, 10)
    if (Number.isNaN(buildNumber)) {
      throw new Error(`Invalid build number from agvtool: "${buildNumberStr}"`)
    }
    return buildNumber
  } catch (error) {
    console.error('Error getting build number:', error.message)
    return null
  }
}

/**
 * Updates package.json version based on iOS build number.
 *
 * Version Format: 0.{buildNumber}.0
 * This intentionally couples the package version to the iOS build number
 * to maintain version consistency across platforms.
 *
 * Example: iOS build 22 -> package version 0.22.0
 *
 * @param {number} buildNumber - The iOS build number
 * @returns {string} The new semantic version
 */
function updatePackageVersion(buildNumber) {
  const packagePath = path.join(__dirname, '..', 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

  // Version format configuration
  // Change these values if you need a different versioning strategy
  const VERSION_CONFIG = {
    major: 0, // Major version (breaking changes)
    minor: buildNumber, // Minor version (tied to iOS build)
    patch: 0, // Patch version (bug fixes)
  }

  // Generate semantic version from configuration
  const newVersion = `${VERSION_CONFIG.major}.${VERSION_CONFIG.minor}.${VERSION_CONFIG.patch}`
  packageJson.version = newVersion

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')

  return newVersion
}

function syncVersions() {
  console.log('🔄 Syncing versions...')

  // Validate we're in the correct directory
  validateWorkingDirectory()

  const buildNumber = getCurrentBuildNumber()
  if (buildNumber == null || Number.isNaN(buildNumber)) {
    console.error('❌ Could not get iOS build number')
    process.exit(1)
  }

  const newVersion = updatePackageVersion(buildNumber)

  console.log(`✅ Version synchronized:`)
  console.log(`   iOS Build: ${buildNumber}`)
  console.log(`   Package.json: ${newVersion}`)

  return { buildNumber, version: newVersion }
}

if (require.main === module) {
  syncVersions()
}

module.exports = { syncVersions }
