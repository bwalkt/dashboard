module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  plugins: ['react', 'react-native'],
  env: {
    node: true,
    es6: true,
    'react-native/react-native': true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'no-unused-vars': 'warn',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
  },
}
