import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/transactions': {
        target: 'http://alert-api:8000',
        changeOrigin: true
      },
      '/alerts': {
        target: 'http://alert-api:8000',
        changeOrigin: true
      },
      '/stats': {
        target: 'http://alert-api:8000',
        changeOrigin: true
      },
      '/health': {
        target: 'http://alert-api:8000',
        changeOrigin: true
      }
    }
  }
});
