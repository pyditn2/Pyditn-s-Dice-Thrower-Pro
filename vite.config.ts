import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Set by `tauri dev` when developing for a device on the local network.
const tauriDevHost = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs plus hash routing let the same build run inside Tauri and from any
  // folder on a static web host.
  base: './',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: {
    format: 'es',
  },
  clearScreen: false,
  server: {
    // 1420 is used by the old app's dev server; keep both runnable side by side.
    port: 1430,
    strictPort: true,
    host: tauriDevHost || false,
    hmr: tauriDevHost ? { protocol: 'ws', host: tauriDevHost, port: 1431 } : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    target: 'es2022',
  },
})
