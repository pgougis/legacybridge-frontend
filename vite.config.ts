import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const API = 'http://localhost:5064'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main:    resolve(__dirname, 'index.html'),
        swagger: resolve(__dirname, 'swagger-viewer.html'),
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/auth':           { target: API, changeOrigin: true },
      '/customers':      { target: API, changeOrigin: true },
      '/users':          { target: API, changeOrigin: true },
      '/legacy-sources': { target: API, changeOrigin: true },
      '/legacy':         { target: API, changeOrigin: true },
      '/access-plans':   { target: API, changeOrigin: true },
    },
  },
})
