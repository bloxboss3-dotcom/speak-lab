import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites from /<repo>/, so the build needs a base
// path. Local `npm run dev` and `npm run preview` keep "/" so nothing about
// deployment leaks into ordinary development.
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    // The app is a single screen-flow; one bundle loads faster than four.
    chunkSizeWarningLimit: 900,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
