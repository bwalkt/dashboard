// Mock implementation of uuid for Jest tests
module.exports = {
  v7: jest.fn(() => 'mock-uuid-v7-' + Math.random().toString(36).substr(2, 9)),
}
