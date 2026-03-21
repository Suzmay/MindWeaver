import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.jsdelivr.net https://huggingface.co; connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co http://localhost:11434; worker-src 'self' blob: data:; child-src 'self' blob: data:; font-src 'self' data:; object-src 'none'; base-uri 'self';"
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.jsdelivr.net https://huggingface.co; connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co http://localhost:11434; worker-src 'self' blob: data:; child-src 'self' blob: data:; font-src 'self' data:; object-src 'none'; base-uri 'self';"
    }
  }
})
