#!/usr/bin/env node

const { execSync } = require('child_process')
const { syncVersions } = require('./sync-version.js')
const { generateChangelog } = require('./generate-changelog.js')

function parseVersionType(versionType) {
  const validTypes = ['patch', 'minor', 'major']
  if (!validTypes.includes(versionType)) {
    console.error(`❌ Invalid version type: ${versionType}`)
    console.error(`   Valid types: ${validTypes.join(', ')}`)
    process.exit(1)
  }
  return versionType
}

function incrementVersion(packageVersion, versionType) {
  const [major, minor, patch] = packageVersion.split('.').map(Number)

  switch (versionType) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      throw new Error(`Unknown version type: ${versionType}`)
  }
}

function updatePackageVersion(newVersion) {
  const fs = require('fs')
  const packagePath = 'package.json'
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  packageJson.version = newVersion
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')
}

function createGitTag(version) {
  execSync(`git add package.json CHANGELOG.md ios/`, { stdio: 'inherit' })
  execSync(`git commit -m "chore: release version ${version}"`, { stdio: 'inherit' })
  execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' })
  console.log(`✅ Created git tag: v${version}`)
}

function performRelease(versionType) {
  console.log(`🚀 Starting ${versionType} release...`)

  // Step 1: Get current versions
  const { buildNumber, version: currentVersion } = syncVersions()

  // Step 2: Calculate new version
  const newVersion = incrementVersion(currentVersion, versionType)
  console.log(`📦 New version will be: ${newVersion}`)

  // Step 3: Update package.json
  updatePackageVersion(newVersion)

  // Step 4: Increment iOS build number
  try {
    execSync('cd ios && agvtool bump', { stdio: 'inherit' })
    const newBuildNumber = execSync('cd ios && agvtool what-version -terse', { encoding: 'utf8' }).trim()
    console.log(`📱 iOS build incremented to: ${newBuildNumber}`)
  } catch (error) {
    console.error('❌ Error incrementing iOS build:', error.message)
    console.error('⚠️  Release aborted to prevent version mismatch.')
    process.exit(1)
  }

  // Step 5: Generate changelog
  console.log('📝 Generating changelog...')
  generateChangelog()

  // Step 6: Create git tag
  console.log('🏷️ Creating git tag...')
  try {
    createGitTag(newVersion)
  } catch (error) {
    console.error('❌ Error creating git tag:', error.message)
    console.error('💥 Release aborted due to git error')
    process.exit(1)
  }

  console.log(`🎉 Release ${newVersion} completed!`)
  console.log(`\nNext steps:`)
  console.log(`1. Push changes: git push origin main --tags`)
  console.log(`2. Build for TestFlight: pnpm run build:ios`)
  console.log(`3. Upload to TestFlight: pnpm run testflight`)
}

function main() {
  const versionType = process.argv[2]

  if (!versionType) {
    console.error('❌ Please specify version type')
    console.error('Usage: node release.js [patch|minor|major]')
    process.exit(1)
  }

  const validType = parseVersionType(versionType)
  performRelease(validType)
}

if (require.main === module) {
  main()
}

module.exports = { performRelease }
