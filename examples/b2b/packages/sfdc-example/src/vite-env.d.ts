/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
  readonly VITE_USE_PROXY: "true" | "false";
  readonly VITE_PROXY_URL: string;
  readonly VITE_PROXY_TARGET: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
