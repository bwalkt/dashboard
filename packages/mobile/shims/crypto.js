// Shim for Node.js crypto module in React Native
const webCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined

if (webCrypto) {
  module.exports = webCrypto
} else {
  module.exports = new Proxy(
    {},
    {
      get() {
        throw new Error("Node.js 'crypto' is not available in React Native. Use globalThis.crypto (Web Crypto API).")
      },
    },
  )
}
