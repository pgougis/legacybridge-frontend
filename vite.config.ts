import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API = 'http://localhost:5064'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/auth':           { target: API, changeOrigin: true },
      '/customers':      { target: API, changeOrigin: true },
      '/users':          { target: API, changeOrigin: true },
      '/legacy-sources': { target: API, changeOrigin: true },
      '/legacy':         { target: API, changeOrigin: true },
      '/access-plans':   { target: API, changeOrigin: true },
      '/api-logs':       { target: API, changeOrigin: true },
      '/swagger':        { target: API, changeOrigin: true },
      '/chat':           { target: API, changeOrigin: true },
    },
  },
})
