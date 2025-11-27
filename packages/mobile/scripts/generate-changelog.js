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

function getLatestTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim()
  } catch (error) {
    return null // No tags found
  }
}

function getCommitsSinceTag(tag) {
  const command = tag
    ? `git log ${tag}..HEAD --oneline --pretty=format:"%h %s"`
    : `git log --oneline --pretty=format:"%h %s"`

  try {
    const commits = execSync(command, { encoding: 'utf8' }).trim()
    return commits ? commits.split('\n') : []
  } catch (error) {
    return []
  }
}

function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    other: [],
  }

  commits.forEach(commit => {
    const lower = commit.toLowerCase()
    
    // Use regex with word boundaries for precise matching
    // This prevents matching prefixes inside words
    if (/\b(feat|feature|add):/.test(lower)) {
      categories.features.push(commit)
    } else if (/\b(fix|bug|hotfix):/.test(lower)) {
      categories.fixes.push(commit)
    } else if (/\b(improve|update|enhance|refactor|perf|style):/.test(lower)) {
      categories.improvements.push(commit)
    } else if (/\b(docs|doc):/.test(lower)) {
      // Separate documentation changes (optional category)
      categories.other.push(commit)
    } else if (/\b(test|tests):/.test(lower)) {
      // Test-related changes
      categories.other.push(commit)
    } else if (/\b(chore|build|ci):/.test(lower)) {
      // Maintenance and build-related changes
      categories.other.push(commit)
    } else {
      categories.other.push(commit)
    }
  })

  return categories
}

function generateChangelog() {
  // Validate we're in the correct directory
  validateWorkingDirectory()
  
  const latestTag = getLatestTag()
  const commits = getCommitsSinceTag(latestTag)

  if (commits.length === 0) {
    console.log('No commits found since last tag.')
    return
  }

  const categories = categorizeCommits(commits)
  const currentDate = new Date().toISOString().split('T')[0]

  const projectRoot = path.resolve(__dirname, '..')
  const packageJsonPath = path.join(projectRoot, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const version = packageJson.version

  let changelog = `# Changelog\n\n`
  changelog += `## [${version}] - ${currentDate}\n\n`

  if (latestTag) {
    changelog += `Changes since ${latestTag}:\n\n`
  } else {
    changelog += `Initial release:\n\n`
  }

  if (categories.features.length > 0) {
    changelog += `### 🚀 New Features\n`
    categories.features.forEach(commit => {
      changelog += `- ${commit}\n`
    })
    changelog += '\n'
  }

  if (categories.fixes.length > 0) {
    changelog += `### 🐛 Bug Fixes\n`
    categories.fixes.forEach(commit => {
      changelog += `- ${commit}\n`
    })
    changelog += '\n'
  }

  if (categories.improvements.length > 0) {
    changelog += `### 🔧 Improvements\n`
    categories.improvements.forEach(commit => {
      changelog += `- ${commit}\n`
    })
    changelog += '\n'
  }

  if (categories.other.length > 0) {
    changelog += `### 📝 Other Changes\n`
    categories.other.forEach(commit => {
      changelog += `- ${commit}\n`
    })
    changelog += '\n'
  }

  // Append to existing changelog or create new one
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md')
  let existingChangelog = ''

  if (fs.existsSync(changelogPath)) {
    existingChangelog = fs.readFileSync(changelogPath, 'utf8')
    // Remove the header if it exists - more tolerant approach
    existingChangelog = existingChangelog.trim()
    if (existingChangelog.startsWith('# Changelog')) {
      const lines = existingChangelog.split('\n')
      lines.shift() // Remove the header line
      existingChangelog = lines.join('\n').replace(/^\n+/, '') // Remove leading newlines
    }
  }

  const finalChangelog = changelog + existingChangelog
  fs.writeFileSync(changelogPath, finalChangelog)

  console.log(`✅ Changelog generated for version ${version}`)
  console.log(`📄 Written to ${changelogPath}`)
  console.log(`📊 ${commits.length} commits processed`)
}

if (require.main === module) {
  generateChangelog()
}

module.exports = { generateChangelog }
