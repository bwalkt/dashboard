// Empty shim for Node.js crypto module
// React Native uses the Web Crypto API via globalThis.crypto
// The shared code has runtime detection and falls back appropriately
module.exports = {}
