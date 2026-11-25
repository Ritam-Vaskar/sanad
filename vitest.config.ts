import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Native tsconfig paths resolution (replaces vite-tsconfig-paths plugin)
    alias: {
      '@': new URL('./', import.meta.url).pathname.replace(/\/$/, ''),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
})
