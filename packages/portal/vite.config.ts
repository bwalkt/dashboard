import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), TanStackRouterVite()],
  clearScreen: false,
  server: {
    port: 1430,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1430,
        }
      : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/auth/callback': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@pzero/shared/mock': path.resolve(__dirname, '../shared/dist/mock'),
      '@pzero/shared': path.resolve(__dirname, '../shared/dist'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['@pzero/shared', 'zod', 'react', 'react-dom'],
  },
  build: {
    commonjsOptions: {
      include: [/shared/, /node_modules/],
    },
  },
})
