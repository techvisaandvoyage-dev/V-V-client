import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — rarely changes, gets long-lived cache
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime'],
          // Animation library — large but stable
          'framer-motion': ['framer-motion'],
          // Firebase — only loaded on auth pages
          'firebase': ['firebase/app', 'firebase/auth'],
          // Data fetching
          'react-query': ['@tanstack/react-query'],
          // PDF libraries (force separation so they don't get bundled into the entry chunk via fileValidation)
          'pdf': ['pdf-lib', 'pdfjs-dist'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 0,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
