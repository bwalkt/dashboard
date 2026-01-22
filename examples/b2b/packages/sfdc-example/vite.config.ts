import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  define: {
    global: 'globalThis',
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1420,
        }
      : undefined,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['ajv'],
  },
  build: {
    commonjsOptions: {
      include: [/shared/, /node_modules/],
    },
  },
})
