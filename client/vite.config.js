import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API calls during development to the Node server on port 3001
      '/upload': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/songs': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/albums': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/genres': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/artists': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/listeners': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
