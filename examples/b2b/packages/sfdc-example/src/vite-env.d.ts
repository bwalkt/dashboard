/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_USE_PROXY: 'true' | 'false'
  readonly VITE_PROXY_URL: string
  readonly VITE_PROXY_TARGET: string
  readonly VITE_OTEL_EXPORTER_URL?: string
  readonly VITE_CHALLENGE_SECRET: string
}

interface ImportMeta {
  env: ImportMetaEnv
}
