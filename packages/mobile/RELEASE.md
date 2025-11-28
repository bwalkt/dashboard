# Release Management

This project includes automated scripts for version management and changelog generation.

## Available Scripts

### `pnpm run version:sync`
Synchronizes the package.json version with the iOS build number.
- Reads current iOS build number (e.g., 22)
- Updates package.json version to match (e.g., 0.22.0)

### `pnpm run changelog`
Generates a changelog from git commits since the last tag.
- Categorizes commits by type (features, fixes, improvements, other)
- Creates or updates CHANGELOG.md
- Uses conventional commit prefixes (feat:, fix:, etc.)

### `pnpm run release:[type]`
Performs a complete release workflow:
- **patch**: 0.22.0 → 0.22.1 (bug fixes)
- **minor**: 0.22.0 → 0.23.0 (new features)  
- **major**: 0.22.0 → 1.0.0 (breaking changes)

#### Release workflow:
1. Syncs current versions
2. Increments package.json version
3. Increments iOS build number
4. Generates changelog
5. Creates git commit and tag

## Example Usage

```bash
# Quick sync current versions
pnpm run version:sync

# Generate changelog only
pnpm run changelog

# Create a patch release (bug fixes)
pnpm run release:patch

# Create a minor release (new features)
pnpm run release:minor

# Create a major release (breaking changes)  
pnpm run release:major
```

## Release Process

1. **Development**: Make changes and commit with conventional commit messages:
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug in authentication" 
   git commit -m "improve: enhance user interface"
   ```

2. **Release**: Run the appropriate release command:
   ```bash
   pnpm run release:minor  # For new features
   ```

3. **Deploy**: Push and build for TestFlight:
   ```bash
   git push origin main --tags
   pnpm run build:ios
   pnpm run testflight
   ```

## Version Scheme

- **Package.json**: Semantic versioning (0.22.0)
- **iOS Build**: Auto-incremented number (22, 23, 24...)
- **Git Tags**: v0.22.0, v0.23.0, etc.

## Changelog Format

The generated changelog includes:
- 🚀 **New Features** (feat: commits)
- 🐛 **Bug Fixes** (fix: commits)  
- 🔧 **Improvements** (improve:/update: commits)
- 📝 **Other Changes** (all other commits)

Each entry includes the commit hash and message for traceability.