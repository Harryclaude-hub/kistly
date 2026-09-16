import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Unter GitHub Pages liegt die App in einem Unterordner. VITE_BASE setzt
// den Pfad, ueberall sonst bleibt es die Wurzel.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
  build: { target: 'es2022', sourcemap: false },
})
