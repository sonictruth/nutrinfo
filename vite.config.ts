import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/nutrinfo/',
  plugins: [react()],
  server: {
    // `npm run dev -- --host` exposes the dev server on the LAN so a phone can
    // reach it. Note: the camera only works on localhost or HTTPS (see README).
    port: 5173,
  },
})
