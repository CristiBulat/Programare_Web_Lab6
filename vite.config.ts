import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages: served at https://<user>.github.io/<repo>/
  // Override at build time via VITE_BASE env var (e.g. VITE_BASE=/lab6/ npm run build).
  base: process.env.VITE_BASE ?? './',
})
