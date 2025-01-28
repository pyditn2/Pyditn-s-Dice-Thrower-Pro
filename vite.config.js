import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [vue()],
  
  build: {
    target: 'esnext',
    assetsInlineLimit: 0
  },
  
  worker: {
    format: 'es',
    plugins: () => [vue()] // Changed to function syntax
  },
  
  // Keep existing Tauri configuration
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? {
      protocol: "ws",
      host,
      port: 1421,
    } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});