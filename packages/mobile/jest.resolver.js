module.exports = (path, options) => {
  // Remove .js extension from TypeScript imports
  const jsExtRegex = /\.js$/
  if (jsExtRegex.test(path)) {
    const tsPath = path.replace(jsExtRegex, '.ts')
    const tsxPath = path.replace(jsExtRegex, '.tsx')

    try {
      return options.defaultResolver(tsPath, options)
    } catch (e1) {
      try {
        return options.defaultResolver(tsxPath, options)
      } catch (e2) {
        // If both .ts and .tsx fail, try without extension
        try {
          return options.defaultResolver(path.replace(jsExtRegex, ''), options)
        } catch (e3) {
          // Fall back to original path
        }
      }
    }
  }

  return options.defaultResolver(path, options)
}
