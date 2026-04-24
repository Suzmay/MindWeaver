import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false
      }
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.jsdelivr.net https://huggingface.co https://api.iconify.design; connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co http://localhost:11434 https://api.iconify.design http://localhost:8788; worker-src 'self' blob: data:; child-src 'self' blob: data:; font-src 'self' data:; object-src 'none'; base-uri 'self';"
    }
  },
  preview: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false
      }
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.jsdelivr.net https://huggingface.co https://api.iconify.design; connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co http://localhost:11434 https://api.iconify.design http://localhost:8788; worker-src 'self' blob: data:; child-src 'self' blob: data:; font-src 'self' data:; object-src 'none'; base-uri 'self';"
    }
  }
})