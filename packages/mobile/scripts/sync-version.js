#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function getCurrentBuildNumber() {
  try {
    const buildNumber = execSync('cd ios && agvtool what-version -terse', { encoding: 'utf8' }).trim()
    return parseInt(buildNumber, 10)
  } catch (error) {
    console.error('Error getting build number:', error.message)
    return null
  }
}

function updatePackageVersion(buildNumber) {
  const packagePath = 'package.json'
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
  if (!buildNumber) {
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
