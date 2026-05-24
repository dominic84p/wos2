import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  server: {
    watch: {
      // Don't watch the 512MB of EaglerCraft HTML files — they never change at runtime
      ignored: ['**/public/eaglercraft/**'],
    },
  },
})
