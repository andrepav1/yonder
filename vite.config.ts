/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // The city dataset (~413 KB) is imported as a module and inlined into the
    // main chunk on purpose — it keeps cities.ts synchronous and the app fully
    // offline-capable. Raise the warning threshold to acknowledge that.
    chunkSizeWarningLimit: 700,
  },
  test: {
    // Pure-logic suites run in Node; UI tests can opt into jsdom per-file.
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
