import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    testTimeout: 30000, // 30 seconds per test
    isolate: true, // Run tests in isolation to prevent hanging
    pool: 'forks', // Use forks pool for better isolation
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '*.config.ts', '**/*.test.ts', '**/*.spec.ts', '**/index.ts'],
    },
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
})
