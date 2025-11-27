#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

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

function updatePackageVersion(buildNumber) {
  const packagePath = path.join(__dirname, '..', 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

  // Convert build number to semantic version (e.g., 22 -> 0.22.0)
  const newVersion = `0.${buildNumber}.0`
  packageJson.version = newVersion

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')

  return newVersion
}

function syncVersions() {
  console.log('🔄 Syncing versions...')

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
